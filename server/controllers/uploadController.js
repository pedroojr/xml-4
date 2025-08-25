export const uploadXml = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const xmlContent = req.file.buffer.toString('utf-8');
    res.json({
      message: 'Arquivo recebido com sucesso',
      content: xmlContent.substring(0, 500) + '...'
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
