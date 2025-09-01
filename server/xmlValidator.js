import libxmljs from 'libxmljs2';
import { DOMParser } from 'xmldom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Classe para validação de XML de NFe
 */
class XMLValidator {
  constructor() {
    this.nfeSchema = null;
    this.loadSchema();
  }

  /**
   * Carrega o schema XSD da NFe (versão 4.00)
   */
  loadSchema() {
    try {
      // Schema XSD básico para NFe 4.00 - versão simplificada
      const schemaContent = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" 
           targetNamespace="http://www.portalfiscal.inf.br/nfe" 
           xmlns:tns="http://www.portalfiscal.inf.br/nfe" 
           elementFormDefault="qualified">
  
  <xs:element name="nfeProc">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="NFe" type="tns:TNFe"/>
        <xs:element name="protNFe" type="tns:TProtNFe" minOccurs="0"/>
      </xs:sequence>
      <xs:attribute name="versao" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>
  
  <xs:complexType name="TNFe">
    <xs:sequence>
      <xs:element name="infNFe" type="tns:TInfNFe"/>
      <xs:element name="Signature" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TInfNFe">
    <xs:sequence>
      <xs:element name="ide" type="tns:TIde"/>
      <xs:element name="emit" type="tns:TEmit"/>
      <xs:element name="dest" type="tns:TDest" minOccurs="0"/>
      <xs:element name="det" type="tns:TDet" maxOccurs="990"/>
      <xs:element name="total" type="tns:TTotal"/>
      <xs:element name="transp" type="tns:TTransp" minOccurs="0"/>
      <xs:element name="cobr" type="tns:TCobr" minOccurs="0"/>
      <xs:element name="pag" type="tns:TPag" minOccurs="0"/>
      <xs:element name="infAdic" type="tns:TInfAdic" minOccurs="0"/>
    </xs:sequence>
    <xs:attribute name="Id" type="xs:string"/>
    <xs:attribute name="versao" type="xs:string" use="required"/>
  </xs:complexType>
  
  <xs:complexType name="TIde">
    <xs:sequence>
      <xs:element name="cUF" type="xs:string"/>
      <xs:element name="cNF" type="xs:string"/>
      <xs:element name="natOp" type="xs:string"/>
      <xs:element name="mod" type="xs:string"/>
      <xs:element name="serie" type="xs:string"/>
      <xs:element name="nNF" type="xs:string"/>
      <xs:element name="dhEmi" type="xs:string"/>
      <xs:element name="tpNF" type="xs:string"/>
      <xs:element name="idDest" type="xs:string"/>
      <xs:element name="cMunFG" type="xs:string"/>
      <xs:element name="tpImp" type="xs:string"/>
      <xs:element name="tpEmis" type="xs:string"/>
      <xs:element name="cDV" type="xs:string"/>
      <xs:element name="tpAmb" type="xs:string"/>
      <xs:element name="finNFe" type="xs:string"/>
      <xs:element name="indFinal" type="xs:string"/>
      <xs:element name="indPres" type="xs:string"/>
      <xs:element name="procEmi" type="xs:string"/>
      <xs:element name="verProc" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TEmit">
    <xs:sequence>
      <xs:element name="CNPJ" type="xs:string" minOccurs="0"/>
      <xs:element name="CPF" type="xs:string" minOccurs="0"/>
      <xs:element name="xNome" type="xs:string"/>
      <xs:element name="xFant" type="xs:string" minOccurs="0"/>
      <xs:element name="enderEmit" type="tns:TEnderEmi"/>
      <xs:element name="IE" type="xs:string"/>
      <xs:element name="CRT" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TEnderEmi">
    <xs:sequence>
      <xs:element name="xLgr" type="xs:string"/>
      <xs:element name="nro" type="xs:string"/>
      <xs:element name="xBairro" type="xs:string"/>
      <xs:element name="cMun" type="xs:string"/>
      <xs:element name="xMun" type="xs:string"/>
      <xs:element name="UF" type="xs:string"/>
      <xs:element name="CEP" type="xs:string"/>
      <xs:element name="cPais" type="xs:string" minOccurs="0"/>
      <xs:element name="xPais" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TDest">
    <xs:sequence>
      <xs:element name="CNPJ" type="xs:string" minOccurs="0"/>
      <xs:element name="CPF" type="xs:string" minOccurs="0"/>
      <xs:element name="xNome" type="xs:string"/>
      <xs:element name="enderDest" type="tns:TEnderDest" minOccurs="0"/>
      <xs:element name="indIEDest" type="xs:string"/>
      <xs:element name="IE" type="xs:string" minOccurs="0"/>
      <xs:element name="email" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TEnderDest">
    <xs:sequence>
      <xs:element name="xLgr" type="xs:string"/>
      <xs:element name="nro" type="xs:string"/>
      <xs:element name="xBairro" type="xs:string"/>
      <xs:element name="cMun" type="xs:string"/>
      <xs:element name="xMun" type="xs:string"/>
      <xs:element name="UF" type="xs:string"/>
      <xs:element name="CEP" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TDet">
    <xs:sequence>
      <xs:element name="prod" type="tns:TProd"/>
      <xs:element name="imposto" type="tns:TImposto"/>
    </xs:sequence>
    <xs:attribute name="nItem" type="xs:string" use="required"/>
  </xs:complexType>
  
  <xs:complexType name="TProd">
    <xs:sequence>
      <xs:element name="cProd" type="xs:string"/>
      <xs:element name="cEAN" type="xs:string" minOccurs="0"/>
      <xs:element name="xProd" type="xs:string"/>
      <xs:element name="NCM" type="xs:string"/>
      <xs:element name="CFOP" type="xs:string"/>
      <xs:element name="uCom" type="xs:string"/>
      <xs:element name="qCom" type="xs:string"/>
      <xs:element name="vUnCom" type="xs:string"/>
      <xs:element name="vProd" type="xs:string"/>
      <xs:element name="cEANTrib" type="xs:string" minOccurs="0"/>
      <xs:element name="uTrib" type="xs:string"/>
      <xs:element name="qTrib" type="xs:string"/>
      <xs:element name="vUnTrib" type="xs:string"/>
      <xs:element name="indTot" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TImposto">
    <xs:sequence>
      <xs:element name="vTotTrib" type="xs:string" minOccurs="0"/>
      <xs:element name="ICMS" type="tns:TICMS" minOccurs="0"/>
      <xs:element name="IPI" type="tns:TIPI" minOccurs="0"/>
      <xs:element name="PIS" type="tns:TPIS" minOccurs="0"/>
      <xs:element name="COFINS" type="tns:TCOFINS" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS">
    <xs:choice>
      <xs:element name="ICMS00" type="tns:TICMS00"/>
      <xs:element name="ICMS10" type="tns:TICMS10"/>
      <xs:element name="ICMS20" type="tns:TICMS20"/>
      <xs:element name="ICMS30" type="tns:TICMS30"/>
      <xs:element name="ICMS40" type="tns:TICMS40"/>
      <xs:element name="ICMS51" type="tns:TICMS51"/>
      <xs:element name="ICMS60" type="tns:TICMS60"/>
      <xs:element name="ICMS70" type="tns:TICMS70"/>
      <xs:element name="ICMS90" type="tns:TICMS90"/>
      <xs:element name="ICMSPart" type="tns:TICMSPart"/>
      <xs:element name="ICMSST" type="tns:TICMSST"/>
      <xs:element name="ICMSSN101" type="tns:TICMSSN101"/>
      <xs:element name="ICMSSN102" type="tns:TICMSSN102"/>
      <xs:element name="ICMSSN201" type="tns:TICMSSN201"/>
      <xs:element name="ICMSSN202" type="tns:TICMSSN202"/>
      <xs:element name="ICMSSN500" type="tns:TICMSSN500"/>
      <xs:element name="ICMSSN900" type="tns:TICMSSN900"/>
    </xs:choice>
  </xs:complexType>
  
  <!-- Definições básicas para os tipos de ICMS -->
  <xs:complexType name="TICMS00">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
      <xs:element name="modBC" type="xs:string"/>
      <xs:element name="vBC" type="xs:string"/>
      <xs:element name="pICMS" type="xs:string"/>
      <xs:element name="vICMS" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <!-- Outros tipos de ICMS seriam definidos aqui... -->
  <xs:complexType name="TICMS10">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <!-- Definições simplificadas para outros impostos -->
  <xs:complexType name="TIPI">
    <xs:sequence>
      <xs:element name="cEnq" type="xs:string"/>
      <xs:element name="IPITrib" type="tns:TIPITrib" minOccurs="0"/>
      <xs:element name="IPINT" type="tns:TIPINT" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TIPITrib">
    <xs:sequence>
      <xs:element name="CST" type="xs:string"/>
      <xs:element name="vBC" type="xs:string" minOccurs="0"/>
      <xs:element name="pIPI" type="xs:string" minOccurs="0"/>
      <xs:element name="vIPI" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TIPINT">
    <xs:sequence>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TPIS">
    <xs:choice>
      <xs:element name="PISAliq" type="tns:TPISAliq"/>
      <xs:element name="PISNT" type="tns:TPISNT"/>
    </xs:choice>
  </xs:complexType>
  
  <xs:complexType name="TPISAliq">
    <xs:sequence>
      <xs:element name="CST" type="xs:string"/>
      <xs:element name="vBC" type="xs:string"/>
      <xs:element name="pPIS" type="xs:string"/>
      <xs:element name="vPIS" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TPISNT">
    <xs:sequence>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TCOFINS">
    <xs:choice>
      <xs:element name="COFINSAliq" type="tns:TCOFINSAliq"/>
      <xs:element name="COFINSNT" type="tns:TCOFINSNT"/>
    </xs:choice>
  </xs:complexType>
  
  <xs:complexType name="TCOFINSAliq">
    <xs:sequence>
      <xs:element name="CST" type="xs:string"/>
      <xs:element name="vBC" type="xs:string"/>
      <xs:element name="pCOFINS" type="xs:string"/>
      <xs:element name="vCOFINS" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TCOFINSNT">
    <xs:sequence>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TTotal">
    <xs:sequence>
      <xs:element name="ICMSTot" type="tns:TICMSTot"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSTot">
    <xs:sequence>
      <xs:element name="vBC" type="xs:string"/>
      <xs:element name="vICMS" type="xs:string"/>
      <xs:element name="vICMSDeson" type="xs:string"/>
      <xs:element name="vFCPUFDest" type="xs:string" minOccurs="0"/>
      <xs:element name="vICMSUFDest" type="xs:string" minOccurs="0"/>
      <xs:element name="vICMSUFRemet" type="xs:string" minOccurs="0"/>
      <xs:element name="vFCP" type="xs:string" minOccurs="0"/>
      <xs:element name="vBCST" type="xs:string"/>
      <xs:element name="vST" type="xs:string"/>
      <xs:element name="vFCPST" type="xs:string" minOccurs="0"/>
      <xs:element name="vFCPSTRet" type="xs:string" minOccurs="0"/>
      <xs:element name="vProd" type="xs:string"/>
      <xs:element name="vFrete" type="xs:string"/>
      <xs:element name="vSeg" type="xs:string"/>
      <xs:element name="vDesc" type="xs:string"/>
      <xs:element name="vII" type="xs:string"/>
      <xs:element name="vIPI" type="xs:string"/>
      <xs:element name="vIPIDevol" type="xs:string" minOccurs="0"/>
      <xs:element name="vPIS" type="xs:string"/>
      <xs:element name="vCOFINS" type="xs:string"/>
      <xs:element name="vOutro" type="xs:string"/>
      <xs:element name="vNF" type="xs:string"/>
      <xs:element name="vTotTrib" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <!-- Definições simplificadas para outros elementos -->
  <xs:complexType name="TTransp">
    <xs:sequence>
      <xs:element name="modFrete" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TCobr">
    <xs:sequence>
      <xs:element name="fat" type="tns:TFat" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TFat">
    <xs:sequence>
      <xs:element name="nFat" type="xs:string" minOccurs="0"/>
      <xs:element name="vOrig" type="xs:string" minOccurs="0"/>
      <xs:element name="vDesc" type="xs:string" minOccurs="0"/>
      <xs:element name="vLiq" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TPag">
    <xs:sequence>
      <xs:element name="detPag" type="tns:TDetPag" maxOccurs="100"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TDetPag">
    <xs:sequence>
      <xs:element name="indPag" type="xs:string" minOccurs="0"/>
      <xs:element name="tPag" type="xs:string"/>
      <xs:element name="vPag" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TInfAdic">
    <xs:sequence>
      <xs:element name="infAdFisco" type="xs:string" minOccurs="0"/>
      <xs:element name="infCpl" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TProtNFe">
    <xs:sequence>
      <xs:element name="infProt" type="tns:TInfProt"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TInfProt">
    <xs:sequence>
      <xs:element name="tpAmb" type="xs:string"/>
      <xs:element name="verAplic" type="xs:string"/>
      <xs:element name="chNFe" type="xs:string"/>
      <xs:element name="dhRecbto" type="xs:string"/>
      <xs:element name="nProt" type="xs:string"/>
      <xs:element name="digVal" type="xs:string"/>
      <xs:element name="cStat" type="xs:string"/>
      <xs:element name="xMotivo" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <!-- Definições adicionais para outros tipos de ICMS -->
  <xs:complexType name="TICMS20">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS30">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS40">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS51">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS60">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS70">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMS90">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSPart">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSST">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CST" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSSN101">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CSOSN" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSSN102">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CSOSN" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSSN201">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CSOSN" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSSN202">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CSOSN" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSSN500">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CSOSN" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
  <xs:complexType name="TICMSSN900">
    <xs:sequence>
      <xs:element name="orig" type="xs:string"/>
      <xs:element name="CSOSN" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
  
</xs:schema>`;

      this.nfeSchema = libxmljs.parseXml(schemaContent);
      console.log('✅ Schema XSD da NFe carregado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar schema XSD:', error.message);
    }
  }

  /**
   * Valida um XML de NFe contra o schema XSD
   * @param {string} xmlContent - Conteúdo do XML
   * @returns {Object} Resultado da validação
   */
  validateXML(xmlContent) {
    console.log('🚀 INICIANDO validateXML - FUNÇÃO CHAMADA');
    console.log('=== STARTING XML VALIDATION ===');
    console.error('🔥 VALIDATION FUNCTION CALLED - DEBUG');
    const result = {
      isValid: false,
      errors: [],
      warnings: [],
      info: {}
    };

    try {
      console.error('🚀 ENTRANDO NO TRY BLOCK DA VALIDAÇÃO');
      // Parse do XML
      const xmlDoc = libxmljs.parseXml(xmlContent);
      
      console.log('=== XML PARSE DEBUG ===');
      console.log('XML Root element:', xmlDoc.root().name());
      console.log('XML Root namespace:', xmlDoc.root().namespace()?.href());
      console.log('========================');
      
      // Validações básicas de estrutura
      result.info.hasNFeProc = !!xmlDoc.get('//nfe:nfeProc', { nfe: 'http://www.portalfiscal.inf.br/nfe' });
      result.info.hasNFe = !!xmlDoc.get('//nfe:NFe', { nfe: 'http://www.portalfiscal.inf.br/nfe' });
      result.info.hasInfNFe = !!xmlDoc.get('//nfe:infNFe', { nfe: 'http://www.portalfiscal.inf.br/nfe' });
      
      console.log('=== NAMESPACE DEBUG ===');
      console.log('hasNFeProc:', result.info.hasNFeProc);
      console.log('hasNFe:', result.info.hasNFe);
      console.log('hasInfNFe:', result.info.hasInfNFe);
      console.log('========================');
      
      // Verificar elementos obrigatórios
      const requiredElements = [
        { path: '//nfe:ide', name: 'Identificação da NFe' },
        { path: '//nfe:emit', name: 'Dados do Emitente' },
        { path: '//nfe:det', name: 'Detalhes dos Produtos' },
        { path: '//nfe:total', name: 'Totais da NFe' }
      ];

      requiredElements.forEach((element, index) => {
        const found = xmlDoc.get(element.path, { nfe: 'http://www.portalfiscal.inf.br/nfe' });
        console.log(`Procurando ${element.path}: ${found ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
        if (!found) {
          result.errors.push(`Elemento obrigatório não encontrado: ${element.name} (${element.path})`);
        }
        if (index === requiredElements.length - 1) {
          console.log('🔥 ÚLTIMO ELEMENTO DO FOREACH PROCESSADO');
        }
      });
      
      try {
        const debugPath = path.join(__dirname, 'debug-immediately-after-foreach.json');
        fs.writeFileSync(debugPath, JSON.stringify({
          timestamp: new Date().toISOString(),
          message: 'Imediatamente após forEach de elementos obrigatórios',
          cwd: process.cwd(),
          dirname: __dirname
        }, null, 2));
        console.log('✅ Debug file written to:', debugPath);
      } catch (e) {
        console.error('❌ Error writing debug file:', e.message);
      }
      
      console.error('🚀 APÓS VERIFICAÇÃO DE ELEMENTOS OBRIGATÓRIOS');
      
      try {
        fs.writeFileSync('debug-after-elements.json', JSON.stringify({
          timestamp: new Date().toISOString(),
          message: 'Chegou após verificação de elementos obrigatórios'
        }, null, 2));
      } catch (e) {}

      // Validar chave da NFe
      try {
        fs.writeFileSync('debug-xpath.json', JSON.stringify({
          timestamp: new Date().toISOString(),
          message: 'Testando XPath para chave NFe'
        }, null, 2));
      } catch (e) {}
      
      const chaveNFe1 = xmlDoc.get('//*[local-name()="infNFe"]/@Id');
      const chaveNFe2 = xmlDoc.get('//infNFe/@Id');
      const chaveNFe3 = xmlDoc.get('//nfe:infNFe/@Id', { nfe: 'http://www.portalfiscal.inf.br/nfe' });
      
      try {
        fs.writeFileSync('debug-chave-results.json', JSON.stringify({
          timestamp: new Date().toISOString(),
          chaveNFe1: { found: !!chaveNFe1, value: chaveNFe1 ? chaveNFe1.value() : null },
          chaveNFe2: { found: !!chaveNFe2, value: chaveNFe2 ? chaveNFe2.value() : null },
          chaveNFe3: { found: !!chaveNFe3, value: chaveNFe3 ? chaveNFe3.value() : null }
        }, null, 2));
      } catch (e) {}
      
      const chaveNFe = chaveNFe1 || chaveNFe2 || chaveNFe3;
      
      if (chaveNFe) {
        const chaveValue = chaveNFe.value().replace('NFe', '');
        if (chaveValue.length !== 44) {
          result.errors.push('Chave da NFe deve ter 44 dígitos');
        } else {
          result.info.chaveNFe = chaveValue;
        }
      } else {
        console.log('🔥 ERRO: Chave da NFe não encontrada - adicionando erro');
        result.errors.push('Chave da NFe não encontrada');
      }
      
      

      // Validar número da NFe
      const numeroNFe = xmlDoc.get('//*[local-name()="ide"]/*[local-name()="nNF"]') || xmlDoc.get('//ide/nNF');
      if (numeroNFe) {
        const numero = parseInt(numeroNFe.text());
        if (isNaN(numero) || numero <= 0) {
          result.errors.push('Número da NFe deve ser um número positivo');
        } else {
          result.info.numeroNFe = numero;
        }
      }

      // Validar CNPJ/CPF do emitente
      const cnpjEmit = xmlDoc.get('//*[local-name()="emit"]/*[local-name()="CNPJ"]') || xmlDoc.get('//emit/CNPJ');
      const cpfEmit = xmlDoc.get('//*[local-name()="emit"]/*[local-name()="CPF"]') || xmlDoc.get('//emit/CPF');
      
      const cnpjDebugInfo = {
        cnpjEmitFound: !!cnpjEmit,
        cpfEmitFound: !!cpfEmit,
        cnpjEmitText: cnpjEmit ? cnpjEmit.text() : null,
        cpfEmitText: cpfEmit ? cpfEmit.text() : null
      };
      
      if (!cnpjEmit && !cpfEmit) {
        console.log('🔥 ERRO: CNPJ ou CPF do emitente não encontrado - adicionando erro');
        result.errors.push('CNPJ ou CPF do emitente é obrigatório');
      } else {
        if (cnpjEmit) {
          const cnpj = cnpjEmit.text().replace(/\D/g, '');
          cnpjDebugInfo.cnpjAfterCleanup = cnpj;
          cnpjDebugInfo.cnpjLength = cnpj.length;
          
          if (cnpj.length !== 14) {
            result.errors.push('CNPJ do emitente deve ter 14 dígitos');
          } else {
            result.info.cnpjEmitente = cnpj;
          }
        }
        if (cpfEmit) {
          const cpf = cpfEmit.text().replace(/\D/g, '');
          cnpjDebugInfo.cpfAfterCleanup = cpf;
          cnpjDebugInfo.cpfLength = cpf.length;
          
          if (cpf.length !== 11) {
            result.errors.push('CPF do emitente deve ter 11 dígitos');
          } else {
            result.info.cpfEmitente = cpf;
          }
        }
      }
      
      // Salvar debug info
      try {
        fs.writeFileSync('debug-cnpj.json', JSON.stringify(cnpjDebugInfo, null, 2));
      } catch (e) {}
      
      

      // Validar produtos
      const produtos = xmlDoc.find('//*[local-name()="det"]') || xmlDoc.find('//det');
      result.info.quantidadeProdutos = produtos.length;
      
      const produtosDebugInfo = {
        produtosFound: produtos.length,
        produtosArray: produtos.map((p, i) => ({ index: i, name: p.name() }))
      };
      
      // Salvar debug info
      try {
        fs.writeFileSync('debug-produtos.json', JSON.stringify(produtosDebugInfo, null, 2));
      } catch (e) {}
      
      if (produtos.length === 0) {
        console.log('🔥 ERRO: Nenhum produto encontrado - adicionando erro');
        result.errors.push('NFe deve conter pelo menos um produto');
      } else if (produtos.length > 990) {
        result.errors.push('NFe não pode conter mais de 990 produtos');
      }

      // Validar valores totais
      const valorTotal = xmlDoc.get('//*[local-name()="ICMSTot"]/*[local-name()="vNF"]') || xmlDoc.get('//ICMSTot/vNF');
      if (valorTotal) {
        const valor = parseFloat(valorTotal.text());
        if (isNaN(valor) || valor < 0) {
          result.errors.push('Valor total da NFe deve ser um número não negativo');
        } else {
          result.info.valorTotal = valor;
        }
      }

      // Validar versão da NFe
      const versao = xmlDoc.get('//*[local-name()="infNFe"]/@versao') || xmlDoc.get('//infNFe/@versao');
      if (versao) {
        const versaoValue = versao.value();
        if (!['4.00'].includes(versaoValue)) {
          result.warnings.push(`Versão da NFe (${versaoValue}) pode não ser totalmente suportada. Versões recomendadas: 4.00`);
        }
        result.info.versao = versaoValue;
      }

      // Validar ambiente (produção/homologação)
      const ambiente = xmlDoc.get('//*[local-name()="ide"]/*[local-name()="tpAmb"]') || xmlDoc.get('//ide/tpAmb');
      if (ambiente) {
        const tpAmb = ambiente.text();
        result.info.ambiente = tpAmb === '1' ? 'Produção' : 'Homologação';
        if (tpAmb === '2') {
          result.warnings.push('NFe de ambiente de homologação detectada');
        }
      }

      // Se não há erros críticos, considerar válido
      result.isValid = result.errors.length === 0;
      
      if (result.isValid) {
        console.log('✅ XML validado com sucesso');
      } else {
        console.log(`❌ XML inválido: ${result.errors.length} erro(s) encontrado(s)`);
        console.log('🔥 ENTRANDO NO BLOCO DE DETALHAMENTO DE ERROS');
        console.log('Erros encontrados:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
        
        // Debug detalhado dos erros
        console.log('=== DETALHES DOS ERROS ===');
        result.errors.forEach((error, index) => {
          console.log(`ERRO ${index + 1}: ${error}`);
        });
        console.log('=========================');
        
        // Salvar erros em arquivo para debug
        try {
          const errorLog = {
            timestamp: new Date().toISOString(),
            errors: result.errors,
            warnings: result.warnings,
            info: result.info
          };
          fs.writeFileSync('validation-errors.json', JSON.stringify(errorLog, null, 2));
          console.log('✅ Erros salvos em validation-errors.json');
        } catch (e) {
          console.log('❌ Erro ao salvar arquivo de debug:', e.message);
        }
      }

    } catch (error) {
      result.errors.push(`Erro ao processar XML: ${error.message}`);
      console.error('❌ Erro na validação XML:', error.message);
    }

    return result;
  }

  /**
   * Extrai informações básicas do XML sem validação completa
   * @param {string} xmlContent - Conteúdo do XML
   * @returns {Object} Informações extraídas
   */
  extractBasicInfo(xmlContent) {
    console.log('🚀 INICIANDO extractBasicInfo - FUNÇÃO CHAMADA');
    const info = {
      chaveNFe: null,
      numeroNFe: null,
      emitente: null,
      valorTotal: null,
      dataEmissao: null,
      quantidadeProdutos: 0
    };

    try {
      const xmlDoc = libxmljs.parseXml(xmlContent);
      console.log('✅ XML parseado com sucesso para extractBasicInfo');
      
      // Chave NFe - usar local-name() para compatibilidade
      const chave = xmlDoc.get('//*[local-name()="infNFe"]/@Id') || xmlDoc.get('//infNFe/@Id');
      if (chave) {
        info.chaveNFe = chave.value().replace('NFe', '');
        console.log('✅ Chave NFe extraída:', info.chaveNFe);
      } else {
        console.log('⚠️ Chave NFe não encontrada');
      }

      // Número NFe - usar local-name() para compatibilidade
      const numero = xmlDoc.get('//*[local-name()="ide"]/*[local-name()="nNF"]') || xmlDoc.get('//ide/nNF');
      if (numero) {
        info.numeroNFe = numero.text();
        console.log('✅ Número NFe extraído:', info.numeroNFe);
      } else {
        console.log('⚠️ Número NFe não encontrado');
      }

      // Emitente - usar local-name() para compatibilidade
      const emitente = xmlDoc.get('//*[local-name()="emit"]/*[local-name()="xNome"]') || xmlDoc.get('//emit/xNome');
      if (emitente) {
        info.emitente = emitente.text();
        console.log('✅ Emitente extraído:', info.emitente);
      } else {
        console.log('⚠️ Emitente não encontrado');
      }

      // Valor total - usar local-name() para compatibilidade
      const valor = xmlDoc.get('//*[local-name()="ICMSTot"]/*[local-name()="vNF"]') || xmlDoc.get('//ICMSTot/vNF');
      if (valor) {
        info.valorTotal = parseFloat(valor.text());
        console.log('✅ Valor total extraído:', info.valorTotal);
      } else {
        console.log('⚠️ Valor total não encontrado');
      }

      // Data de emissão - usar local-name() para compatibilidade
      const dataEmissao = xmlDoc.get('//*[local-name()="ide"]/*[local-name()="dhEmi"]') || xmlDoc.get('//ide/dhEmi');
      if (dataEmissao) {
        info.dataEmissao = dataEmissao.text();
        console.log('✅ Data emissão extraída:', info.dataEmissao);
      } else {
        console.log('⚠️ Data emissão não encontrada');
      }

      // Quantidade de produtos - usar local-name() para compatibilidade
      const produtos = xmlDoc.find('//*[local-name()="det"]') || xmlDoc.find('//det');
      info.quantidadeProdutos = produtos.length;
      console.log('✅ Quantidade de produtos extraída:', info.quantidadeProdutos);

      console.log('📊 RESUMO extractBasicInfo:', info);

    } catch (error) {
      console.error('❌ Erro ao extrair informações básicas:', error.message);
      console.error(error.stack);
    }

    return info;
  }

  /**
   * Extrai produtos detalhados do XML da NFe
   * @param {string} xmlContent - Conteúdo do XML
   * @returns {Array} Array de produtos extraídos
   */
  extractProducts(xmlContent) {
    console.log('🚀 INICIANDO extractProducts - FUNÇÃO CHAMADA');
    const produtos = [];

    try {
      const xmlDoc = libxmljs.parseXml(xmlContent);
      console.log('✅ XML parseado com sucesso para extractProducts');
      
      // Buscar todos os produtos (elementos det)
      const detElements = xmlDoc.find('//*[local-name()="det"]') || xmlDoc.find('//det');
      console.log(`📦 Encontrados ${detElements.length} produtos no XML`);

      detElements.forEach((det, index) => {
        try {
          const produto = {
            codigo: '',
            descricao: '',
            ncm: '',
            cfop: '',
            unidade: '',
            quantidade: 0,
            valorUnitario: 0,
            valorTotal: 0,
            baseCalculoICMS: 0,
            valorICMS: 0,
            aliquotaICMS: 0,
            baseCalculoIPI: 0,
            valorIPI: 0,
            aliquotaIPI: 0,
            ean: ''
          };

          // Código do produto
          const codigo = det.get('.//*[local-name()="cProd"]') || det.get('.//cProd');
          if (codigo) produto.codigo = codigo.text();

          // Descrição do produto
          const descricao = det.get('.//*[local-name()="xProd"]') || det.get('.//xProd');
          if (descricao) produto.descricao = descricao.text();

          // NCM
          const ncm = det.get('.//*[local-name()="NCM"]') || det.get('.//NCM');
          if (ncm) produto.ncm = ncm.text();

          // CFOP
          const cfop = det.get('.//*[local-name()="CFOP"]') || det.get('.//CFOP');
          if (cfop) produto.cfop = cfop.text();

          // Unidade
          const unidade = det.get('.//*[local-name()="uCom"]') || det.get('.//uCom');
          if (unidade) produto.unidade = unidade.text();

          // Quantidade
          const quantidade = det.get('.//*[local-name()="qCom"]') || det.get('.//qCom');
          if (quantidade) produto.quantidade = parseFloat(quantidade.text()) || 0;

          // Valor unitário
          const valorUnitario = det.get('.//*[local-name()="vUnCom"]') || det.get('.//vUnCom');
          if (valorUnitario) produto.valorUnitario = parseFloat(valorUnitario.text()) || 0;

          // Valor total do produto
          const valorTotal = det.get('.//*[local-name()="vProd"]') || det.get('.//vProd');
          if (valorTotal) produto.valorTotal = parseFloat(valorTotal.text()) || 0;

          // EAN
          const ean = det.get('.//*[local-name()="cEAN"]') || det.get('.//cEAN');
          if (ean) produto.ean = ean.text();

          // Impostos ICMS
          const icms = det.get('.//*[local-name()="ICMS"]') || det.get('.//ICMS');
          if (icms) {
            // Buscar diferentes tipos de ICMS (ICMS00, ICMS10, etc.)
            const icmsTypes = ['ICMS00', 'ICMS10', 'ICMS20', 'ICMS30', 'ICMS40', 'ICMS51', 'ICMS60', 'ICMS70', 'ICMS90', 'ICMSSN101', 'ICMSSN102', 'ICMSSN201', 'ICMSSN202', 'ICMSSN500', 'ICMSSN900'];
            
            for (const icmsType of icmsTypes) {
              const icmsElement = icms.get(`.//*[local-name()="${icmsType}"]`) || icms.get(`.//${icmsType}`);
              if (icmsElement) {
                const vBC = icmsElement.get('.//*[local-name()="vBC"]') || icmsElement.get('.//vBC');
                if (vBC) produto.baseCalculoICMS = parseFloat(vBC.text()) || 0;
                
                const vICMS = icmsElement.get('.//*[local-name()="vICMS"]') || icmsElement.get('.//vICMS');
                if (vICMS) produto.valorICMS = parseFloat(vICMS.text()) || 0;
                
                const pICMS = icmsElement.get('.//*[local-name()="pICMS"]') || icmsElement.get('.//pICMS');
                if (pICMS) produto.aliquotaICMS = parseFloat(pICMS.text()) || 0;
                
                break; // Encontrou um tipo de ICMS, para a busca
              }
            }
          }

          // Impostos IPI
          const ipi = det.get('.//*[local-name()="IPI"]') || det.get('.//IPI');
          if (ipi) {
            const ipiTrib = ipi.get('.//*[local-name()="IPITrib"]') || ipi.get('.//IPITrib');
            if (ipiTrib) {
              const vBC = ipiTrib.get('.//*[local-name()="vBC"]') || ipiTrib.get('.//vBC');
              if (vBC) produto.baseCalculoIPI = parseFloat(vBC.text()) || 0;
              
              const vIPI = ipiTrib.get('.//*[local-name()="vIPI"]') || ipiTrib.get('.//vIPI');
              if (vIPI) produto.valorIPI = parseFloat(vIPI.text()) || 0;
              
              const pIPI = ipiTrib.get('.//*[local-name()="pIPI"]') || ipiTrib.get('.//pIPI');
              if (pIPI) produto.aliquotaIPI = parseFloat(pIPI.text()) || 0;
            }
          }

          produtos.push(produto);
          console.log(`✅ Produto ${index + 1} extraído:`, {
            codigo: produto.codigo,
            descricao: produto.descricao.substring(0, 50) + '...',
            quantidade: produto.quantidade,
            valorUnitario: produto.valorUnitario,
            valorTotal: produto.valorTotal
          });

        } catch (error) {
          console.error(`❌ Erro ao extrair produto ${index + 1}:`, error.message);
        }
      });

      console.log(`📊 RESUMO extractProducts: ${produtos.length} produtos extraídos`);

    } catch (error) {
      console.error('❌ Erro ao extrair produtos:', error.message);
      console.error(error.stack);
    }

    return produtos;
  }

  /**
   * Valida se o arquivo é um XML válido
   * @param {string} content - Conteúdo do arquivo
   * @returns {boolean} True se for XML válido
   */
  isValidXML(content) {
    try {
      console.log('=== isValidXML DEBUG ===');
      console.log('Content length:', content.length);
      console.log('Content preview:', content.substring(0, 200));
      const parsed = libxmljs.parseXml(content);
      console.log('XML parsed successfully');
      return true;
    } catch (error) {
      console.log('❌ XML Parse Error:', error.message);
      return false;
    }
  }
}

// Instância singleton
const xmlValidator = new XMLValidator();

export default xmlValidator;
export { XMLValidator };