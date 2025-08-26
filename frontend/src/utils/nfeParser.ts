import { Product } from '../types/nfe';
import { extrairCorDaDescricao } from './colorParser';
import { extrairTamanhoDaDescricao } from './sizeParser';
import { identifyBrand, analyzeReference } from './brandIdentifier';

const formatarDescricaoComplementar = (texto: string): string => {
  if (!texto) return '';

  // Normalizar espaços e remover espaços extras
  const textoNormalizado = texto.trim().replace(/\s+/g, ' ');

  // Encontrar o padrão "tam: XX" e o código numérico
  const match = textoNormalizado.match(
    /(.*?tam:\s*\d+)\s+(\d+\.\d+\.\d+\.\d+)(-NP.*?)(?:\s+-\s+(?:RSF|N\.FCI).*)?$/i,
  );

  if (!match) return textoNormalizado;

  const [, inicio, codigo, descricaoFinal] = match;

  // Formatar a primeira parte (até o tam: XX)
  const parteInicial = inicio
    .split('-')
    .map((part) => part.trim())
    .join(' / ')
    .toUpperCase();

  // Formatar a parte após o código numérico
  const parteDescricao = descricaoFinal
    .replace(/^-NP/, 'NP')
    .split('-')
    .map((part) => part.trim())
    .join(' / ')
    .trim();

  return `${parteInicial} ${codigo} ${parteDescricao}`;
};

export const parseNFeXML = (xmlText: string): Product[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Erro ao analisar o arquivo XML');
  }

  const ns = 'http://www.portalfiscal.inf.br/nfe';
  const items = xmlDoc.getElementsByTagNameNS(ns, 'det');
  const products: Product[] = [];

  const getElementText = (element: Element, tagName: string) => {
    const el = element.getElementsByTagNameNS(ns, tagName)[0];
    return el ? el.textContent || '' : '';
  };

  const parseNumber = (text: string) => {
    if (!text) return 0;
    const cleanText = text.replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanText);
    return isNaN(number) ? 0 : number;
  };

  const getICMSInfo = (element: Element) => {
    if (!element) return { cst: '', orig: '' };

    const icmsGroups = ['00', '10', '20', '30', '40', '51', '60', '70', '90'];

    for (const group of icmsGroups) {
      const icmsNode = element.getElementsByTagNameNS(ns, `ICMS${group}`)[0];
      if (icmsNode) {
        return {
          cst: getElementText(icmsNode, 'CST'),
          orig: getElementText(icmsNode, 'orig'),
        };
      }
    }

    const icmsSN = element.getElementsByTagNameNS(ns, 'ICMSSN')[0];
    if (icmsSN) {
      return {
        cst: getElementText(icmsSN, 'CSOSN'),
        orig: getElementText(icmsSN, 'orig'),
      };
    }

    return { cst: '', orig: '' };
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prod = item.getElementsByTagNameNS(ns, 'prod')[0];
    const icms = item.getElementsByTagNameNS(ns, 'ICMS')[0];

    if (!prod) {
      console.warn(`Item ${i + 1}: Nó 'prod' não encontrado`);
      continue;
    }

    const icmsInfo = getICMSInfo(icms);

    const quantidade = parseNumber(getElementText(prod, 'qCom'));
    const valorUnitario = parseNumber(getElementText(prod, 'vUnCom'));
    const valorTotal = parseNumber(getElementText(prod, 'vProd'));
    const discount = parseNumber(getElementText(prod, 'vDesc'));
    const netPrice = valorTotal - discount;

    const nome = getElementText(prod, 'xProd');
    const codigo = getElementText(prod, 'cProd');
    const corIdentificada = extrairCorDaDescricao(nome);
    const tamanho = extrairTamanhoDaDescricao(nome);
    const referencia = codigo;

    analyzeReference(referencia, nome);

    const { brand, confidence } = identifyBrand(referencia, nome);

    const product: Product = {
      codigo,
      ean: getElementText(prod, 'cEAN'),
      descricao: nome,
      ncm: getElementText(prod, 'NCM'),
      cfop: getElementText(prod, 'CFOP'),
      unidade: getElementText(prod, 'uCom'),
      quantidade,
      valorUnitario,
      valorTotal,
      discount,
      netPrice,
      color: corIdentificada || '',
      size: tamanho,
      reference: referencia,
      salePrice: netPrice * 1.3,
      brand,
      descricao_complementar: formatarDescricaoComplementar(
        item.getElementsByTagName('infAdProd')[0]?.textContent || '',
      ),
      baseCalculoICMS: 0,
      valorICMS: 0,
      aliquotaICMS: 0,
      baseCalculoIPI: 0,
      valorIPI: 0,
      aliquotaIPI: 0,
    };

    products.push(product);
  }

  return products;
};
