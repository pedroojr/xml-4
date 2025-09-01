import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExportService {
  constructor() {
    this.ensureExportDirectory();
  }

  ensureExportDirectory() {
    const exportDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
  }

  // Exportar para CSV
  async exportToCSV(data, filename = 'export') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filepath = path.join(__dirname, 'exports', `${filename}_${timestamp}.csv`);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Dados inválidos para exportação CSV');
      }

      // Cabeçalhos das colunas
      const headers = Object.keys(data[0]);
      let csvContent = headers.join(',') + '\n';

      // Dados
      data.forEach(row => {
        const values = headers.map(header => {
          let value = row[header] || '';
          // Escapar aspas e vírgulas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      });

      fs.writeFileSync(filepath, csvContent, 'utf8');
      
      logger.info('CSV Export Created', {
        category: 'export',
        filename: path.basename(filepath),
        recordCount: data.length
      });

      return {
        success: true,
        filename: path.basename(filepath),
        filepath,
        recordCount: data.length
      };
    } catch (error) {
      logger.error('CSV Export Error', {
        category: 'export',
        error: error.message,
        filename
      });
      throw error;
    }
  }

  // Exportar para Excel
  async exportToExcel(data, filename = 'export', sheetName = 'Dados') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filepath = path.join(__dirname, 'exports', `${filename}_${timestamp}.xlsx`);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Dados inválidos para exportação Excel');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Cabeçalhos
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Estilizar cabeçalhos
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Dados
      data.forEach(row => {
        const values = headers.map(header => row[header] || '');
        worksheet.addRow(values);
      });

      // Auto-ajustar largura das colunas
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      await workbook.xlsx.writeFile(filepath);
      
      logger.info('Excel Export Created', {
        category: 'export',
        filename: path.basename(filepath),
        recordCount: data.length,
        sheetName
      });

      return {
        success: true,
        filename: path.basename(filepath),
        filepath,
        recordCount: data.length
      };
    } catch (error) {
      logger.error('Excel Export Error', {
        category: 'export',
        error: error.message,
        filename
      });
      throw error;
    }
  }

  // Exportar para PDF
  async exportToPDF(data, filename = 'export', title = 'Relatório de Dados') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filepath = path.join(__dirname, 'exports', `${filename}_${timestamp}.pdf`);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Dados inválidos para exportação PDF');
      }

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Título
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown();
      
      // Data de geração
      doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.moveDown();

      // Cabeçalhos
      const headers = Object.keys(data[0]);
      const columnWidth = (doc.page.width - 100) / headers.length;
      
      let yPosition = doc.y;
      
      // Desenhar cabeçalhos
      doc.fontSize(10).font('Helvetica-Bold');
      headers.forEach((header, index) => {
        doc.text(header, 50 + (index * columnWidth), yPosition, {
          width: columnWidth - 5,
          ellipsis: true
        });
      });
      
      doc.moveDown();
      yPosition = doc.y;
      
      // Linha separadora
      doc.moveTo(50, yPosition).lineTo(doc.page.width - 50, yPosition).stroke();
      doc.moveDown(0.5);
      
      // Dados
      doc.font('Helvetica').fontSize(9);
      
      data.forEach((row, rowIndex) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }
        
        yPosition = doc.y;
        
        headers.forEach((header, colIndex) => {
          const value = row[header] || '';
          doc.text(String(value), 50 + (colIndex * columnWidth), yPosition, {
            width: columnWidth - 5,
            ellipsis: true
          });
        });
        
        doc.moveDown(0.3);
      });

      // Rodapé
      doc.fontSize(8).text(`Total de registros: ${data.length}`, 50, doc.page.height - 50);
      
      doc.end();
      
      // Aguardar conclusão da escrita
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      
      logger.info('PDF Export Created', {
        category: 'export',
        filename: path.basename(filepath),
        recordCount: data.length,
        title
      });

      return {
        success: true,
        filename: path.basename(filepath),
        filepath,
        recordCount: data.length
      };
    } catch (error) {
      logger.error('PDF Export Error', {
        category: 'export',
        error: error.message,
        filename
      });
      throw error;
    }
  }

  // Listar arquivos de exportação
  listExports() {
    try {
      const exportDir = path.join(__dirname, 'exports');
      if (!fs.existsSync(exportDir)) {
        return [];
      }

      const files = fs.readdirSync(exportDir)
        .filter(file => /\.(csv|xlsx|pdf)$/i.test(file))
        .map(file => {
          const filepath = path.join(exportDir, file);
          const stats = fs.statSync(filepath);
          return {
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            type: path.extname(file).toLowerCase().substring(1)
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      logger.error('List Exports Error', {
        category: 'export',
        error: error.message
      });
      return [];
    }
  }

  // Limpar arquivos antigos
  cleanOldExports(daysOld = 7) {
    try {
      const exportDir = path.join(__dirname, 'exports');
      if (!fs.existsSync(exportDir)) {
        return { deleted: 0 };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const files = fs.readdirSync(exportDir);
      let deletedCount = 0;

      files.forEach(file => {
        const filepath = path.join(exportDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.birthtime < cutoffDate) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      });

      logger.info('Old Exports Cleaned', {
        category: 'export',
        deletedCount,
        daysOld
      });

      return { deleted: deletedCount };
    } catch (error) {
      logger.error('Clean Exports Error', {
        category: 'export',
        error: error.message
      });
      throw error;
    }
  }
}

export default new ExportService();