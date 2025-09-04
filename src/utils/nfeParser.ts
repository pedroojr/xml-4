import { Product } from '../types/nfe';
import { extractColorFromDescription } from './colorParser';
import { extractSizeFromDescription } from './sizeParser';
import { identifyBrand, analyzeReference } from './brandIdentifier';

const formatAdditionalDescription = (text: string): string => {
  if (!text) return '';

  // Normalize spaces and remove extra spaces
  let normalizedText = text.trim().replace(/\s+/g, ' ');

  // Find the pattern "tam: XX" and the numeric code
  const match = normalizedText.match(/(.*?tam:\s*\d+)\s+(\d+\.\d+\.\d+\.\d+)(-NP.*?)(?:\s+-\s+(?:RSF|N\.FCI).*)?$/i);

  if (!match) return normalizedText;

  const [, start, code, finalDescription] = match;

  // Format the first part (up to "tam: XX")
  const initialPart = start
    .split('-')
    .map(part => part.trim())
    .join(' / ')
    .toUpperCase();

  // Format the part after the numeric code
  const descriptionPart = finalDescription
    .replace(/^-NP/, 'NP')
    .split('-')
    .map(part => part.trim())
    .join(' / ')
    .trim();

  return `${initialPart} ${code} ${descriptionPart}`;
};

export const parseNFeXML = (xmlText: string): Product[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Error parsing XML file");
  }
  
  const ns = "http://www.portalfiscal.inf.br/nfe";
  const items = xmlDoc.getElementsByTagNameNS(ns, "det");
  const products: Product[] = [];
  
  const getElementText = (element: Element, tagName: string) => {
    const el = element.getElementsByTagNameNS(ns, tagName)[0];
    return el ? el.textContent || "" : "";
  };

  const parseNumber = (text: string) => {
    if (!text) return 0;
    const cleanText = text.replace(/[^\d,.-]/g, '').replace(',', '.');
    const number = parseFloat(cleanText);
    return isNaN(number) ? 0 : number;
  };

  let totalProductsValue = 0;
  let totalInvoiceValue = 0;

  const totalNode = xmlDoc.getElementsByTagNameNS(ns, "total")[0];
  if (totalNode) {
    const icmsTotalNode = totalNode.getElementsByTagNameNS(ns, "ICMSTot")[0];
    if (icmsTotalNode) {
      totalProductsValue = parseNumber(getElementText(icmsTotalNode, "vProd"));
      totalInvoiceValue = parseNumber(getElementText(icmsTotalNode, "vNF"));
    }
  }

  const totalDiscount = totalProductsValue - totalInvoiceValue;
  const discountPercentage = totalDiscount > 0 ? (totalDiscount / totalProductsValue) * 100 : 0;
  
  console.log('Total Products Value:', totalProductsValue);
  console.log('Total Invoice Value:', totalInvoiceValue);
  console.log('Total Discount:', totalDiscount);
  console.log('Discount Percentage:', discountPercentage.toFixed(2) + '%');
  
  const getICMSInfo = (element: Element) => {
    if (!element) return { cst: "", orig: "" };
    
    const icmsGroups = ['00', '10', '20', '30', '40', '51', '60', '70', '90'];
    
    for (const group of icmsGroups) {
      const icmsNode = element.getElementsByTagNameNS(ns, `ICMS${group}`)[0];
      if (icmsNode) {
        return {
          cst: getElementText(icmsNode, "CST"),
          orig: getElementText(icmsNode, "orig"),
        };
      }
    }
    
    const icmsSN = element.getElementsByTagNameNS(ns, "ICMSSN")[0];
    if (icmsSN) {
      return {
        cst: getElementText(icmsSN, "CSOSN"),
        orig: getElementText(icmsSN, "orig"),
      };
    }
    
    return { cst: "", orig: "" };
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prod = item.getElementsByTagNameNS(ns, "prod")[0];
    const icms = item.getElementsByTagNameNS(ns, "ICMS")[0];
    
    if (!prod) {
      console.warn(`Item ${i + 1}: 'prod' node not found`);
      continue;
    }
    
    const icmsInfo = getICMSInfo(icms);
    
    const quantity = parseNumber(getElementText(prod, "qCom"));
    const unitPrice = parseNumber(getElementText(prod, "vUnCom"));
    const totalPrice = parseNumber(getElementText(prod, "vProd"));
    
    const unitDiscount = unitPrice * (discountPercentage / 100);
    const netUnitPrice = unitPrice - unitDiscount;
    
    const totalDiscount = unitDiscount * quantity;
    const netPrice = netUnitPrice * quantity;
    
    const description = getElementText(prod, "xProd");
    const code = getElementText(prod, "cProd");
    const identifiedColor = extractColorFromDescription(description);
    const size = extractSizeFromDescription(description);
    const reference = code;

    analyzeReference(reference, description);

    const { brand, confidence } = identifyBrand(reference, description);

    const product: Product = {
      code: code,
      ean: getElementText(prod, "cEAN"),
      description: description,
      ncm: getElementText(prod, "NCM"),
      cfop: getElementText(prod, "CFOP"),
      unit: getElementText(prod, "uCom"),
      quantity: quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      discount: totalDiscount,
      netPrice: netPrice,
      color: identifiedColor || '',
      size: size,
      reference: reference,
      salePrice: netPrice * 1.3,
      brand: brand,
      additionalDescription: formatAdditionalDescription(item.getElementsByTagName('infAdProd')[0]?.textContent || ''),
      icmsBase: 0,
      icmsValue: 0,
      icmsRate: 0,
      ipiBase: 0,
      ipiValue: 0,
      ipiRate: 0
    };
    
    products.push(product);
  }
  
  return products;
};
