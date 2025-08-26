import { test, expect } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL;
if (!baseURL) {
  throw new Error('TEST_BASE_URL is required');
}
const apiKey = process.env.TEST_API_KEY;

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe>
  <infNFe Id="NFe123">
    <ide>
      <nNF>1</nNF>
      <dhEmi>2024-01-01T00:00:00-03:00</dhEmi>
    </ide>
    <emit>
      <xNome>Fornecedor Teste</xNome>
    </emit>
    <det nItem="1">
      <prod>
        <cProd>001</cProd>
        <xProd>Produto Teste</xProd>
        <NCM>1234</NCM>
        <CFOP>5102</CFOP>
        <uCom>UN</uCom>
        <qCom>1</qCom>
        <vUnCom>10.00</vUnCom>
        <vProd>10.00</vProd>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vNF>10.00</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`;

test('Upload de NFE e visualização de produtos', async ({ request }) => {
  const uploadResponse = await request.post(`${baseURL}/api/upload-xml`, {
    headers: {
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    multipart: {
      xml: {
        name: 'nfe.xml',
        mimeType: 'text/xml',
        buffer: Buffer.from(sampleXml),
      },
    },
  });

  expect(uploadResponse.ok()).toBeTruthy();
  const { id } = await uploadResponse.json();
  expect(id).toBeTruthy();

  const nfeResponse = await request.get(`${baseURL}/api/nfes/${id}`, {
    headers: {
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
  });

  expect(nfeResponse.ok()).toBeTruthy();
  const nfe = await nfeResponse.json();
  expect(Array.isArray(nfe.produtos)).toBeTruthy();
  const hasProduct = nfe.produtos.some((p: any) => p.descricao === 'Produto Teste');
  expect(hasProduct).toBeTruthy();
});
