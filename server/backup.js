import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cron from 'node-cron';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupManager {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30; // Manter 30 backups por padrão
    this.backupSchedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Todo dia às 2h da manhã
    
    this.ensureBackupDirectory();
  }

  /**
   * Garante que o diretório de backup existe
   */
  ensureBackupDirectory() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        console.log(`Diretório de backup criado: ${this.backupDir}`);
      }
    } catch (error) {
      console.error('Erro ao criar diretório de backup:', error);
      throw error;
    }
  }

  /**
   * Gera nome do arquivo de backup com timestamp
   */
  generateBackupFilename() {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    return `database_backup_${timestamp}.sqlite`;
  }

  /**
   * Realiza backup do banco de dados
   */
  async createBackup() {
    const startTime = Date.now();
    try {
      // Verificar se o arquivo de banco existe
      if (!fs.existsSync(this.dbPath)) {
        throw new Error(`Arquivo de banco não encontrado: ${this.dbPath}`);
      }

      const backupFilename = this.generateBackupFilename();
      const backupPath = path.join(this.backupDir, backupFilename);

      logger.info('Backup Started', {
        source: this.dbPath,
        destination: backupPath,
        category: 'backup'
      });

      // Método 1: Backup usando SQLite VACUUM INTO (mais seguro)
      const db = new Database(this.dbPath, { readonly: true });
      
      try {
        // Usar VACUUM INTO para criar uma cópia compacta e consistente
        db.exec(`VACUUM INTO '${backupPath}'`);
        logger.info('Backup Method Used', {
          method: 'VACUUM INTO',
          category: 'backup'
        });
      } catch (vacuumError) {
        logger.warn('VACUUM INTO Failed, Using File Copy', {
          error: vacuumError.message,
          category: 'backup'
        });
        
        // Método 2: Cópia simples de arquivo (fallback)
        db.close();
        fs.copyFileSync(this.dbPath, backupPath);
        logger.info('Backup Method Used', {
          method: 'File Copy',
          category: 'backup'
        });
      } finally {
        if (db.open) {
          db.close();
        }
      }

      // Verificar integridade do backup
      await this.verifyBackup(backupPath);

      // Obter informações do backup
      const stats = fs.statSync(backupPath);
      const duration = Date.now() - startTime;
      const backupInfo = {
        filename: backupFilename,
        path: backupPath,
        size: stats.size,
        created: stats.birthtime,
        sizeFormatted: this.formatFileSize(stats.size)
      };

      logger.backup.created(backupFilename, backupInfo.sizeFormatted, duration);
      
      // Limpar backups antigos
      await this.cleanOldBackups();

      return backupInfo;
    } catch (error) {
      logger.backup.error(error, 'create');
      throw error;
    }
  }

  /**
   * Verifica a integridade do backup
   */
  async verifyBackup(backupPath) {
    try {
      const backupDb = new Database(backupPath, { readonly: true });
      
      // Verificar integridade do banco
      const integrityCheck = backupDb.prepare('PRAGMA integrity_check').get();
      
      if (integrityCheck.integrity_check !== 'ok') {
        throw new Error(`Backup corrompido: ${integrityCheck.integrity_check}`);
      }

      // Verificar se as tabelas principais existem
      const tables = backupDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('nfes', 'produtos')
      `).all();

      if (tables.length < 2) {
        throw new Error('Backup não contém todas as tabelas necessárias');
      }

      // Contar registros para verificação básica
      const nfeCount = backupDb.prepare('SELECT COUNT(*) as count FROM nfes').get();
      const produtoCount = backupDb.prepare('SELECT COUNT(*) as count FROM produtos').get();

      console.log(`Backup verificado: ${nfeCount.count} NFEs, ${produtoCount.count} produtos`);
      
      backupDb.close();
    } catch (error) {
      console.error('Erro na verificação do backup:', error);
      // Remover backup corrompido
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      throw error;
    }
  }

  /**
   * Remove backups antigos mantendo apenas os mais recentes
   */
  async cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.birthtime - a.stats.birthtime); // Mais recente primeiro

      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.info('Old Backup Removed', {
            filename: file.name,
            category: 'backup'
          });
        }

        logger.info('Backup Cleanup Completed', {
          removedCount: filesToDelete.length,
          remainingCount: Math.min(files.length, this.maxBackups),
          category: 'backup'
        });
      }

      logger.info('Backup Maintenance', {
        totalBackups: files.length,
        keepingBackups: Math.min(files.length, this.maxBackups),
        category: 'backup'
      });
    } catch (error) {
      logger.backup.error(error, 'cleanup');
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created); // Mais recente primeiro

      return files;
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Restaura banco de dados a partir de um backup
   */
  async restoreBackup(backupFilename) {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup não encontrado: ${backupFilename}`);
      }

      // Verificar integridade do backup antes de restaurar
      await this.verifyBackup(backupPath);

      // Criar backup do banco atual antes de restaurar
      const currentBackupName = `current_backup_${Date.now()}.sqlite`;
      const currentBackupPath = path.join(this.backupDir, currentBackupName);
      
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, currentBackupPath);
        logger.info('Pre-Restore Backup Created', {
          filename: currentBackupName,
          category: 'backup'
        });
      }

      // Restaurar backup
      fs.copyFileSync(backupPath, this.dbPath);
      logger.backup.restored(backupFilename);

      return {
        restored: backupFilename,
        currentBackup: currentBackupName
      };
    } catch (error) {
      logger.backup.error(error, 'restore');
      throw error;
    }
  }

  /**
   * Formata tamanho do arquivo em formato legível
   */
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Inicia o agendamento automático de backups
   */
  startScheduledBackups() {
    logger.info('Scheduled Backups Configured', {
      schedule: this.backupSchedule,
      category: 'backup'
    });
    
    cron.schedule(this.backupSchedule, async () => {
      logger.info('Scheduled Backup Started', {
        category: 'backup'
      });
      try {
        await this.createBackup();
        logger.info('Scheduled Backup Completed Successfully', {
          category: 'backup'
        });
      } catch (error) {
        logger.backup.error(error, 'scheduled');
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    logger.info('Automatic Backup System Started', {
      category: 'backup'
    });
  }

  /**
   * Para o agendamento de backups
   */
  stopScheduledBackups() {
    cron.getTasks().forEach(task => task.stop());
    logger.info('Automatic Backup System Stopped', {
      category: 'backup'
    });
  }

  /**
   * Obtém estatísticas dos backups
   */
  getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    return {
      count: backups.length,
      totalSize,
      totalSizeFormatted: this.formatFileSize(totalSize),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null,
      backupDir: this.backupDir,
      maxBackups: this.maxBackups,
      schedule: this.backupSchedule
    };
  }
}

// Instância singleton
const backupManager = new BackupManager();

// Exportar para uso em outros módulos
export default backupManager;

// Se executado diretamente, criar backup manual
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      console.log('Criando backup manual...');
      backupManager.createBackup()
        .then(info => {
          console.log('Backup manual concluído:', info);
          process.exit(0);
        })
        .catch(error => {
          console.error('Erro no backup manual:', error);
          process.exit(1);
        });
      break;
      
    case 'list':
      console.log('Listando backups disponíveis:');
      const backups = backupManager.listBackups();
      if (backups.length === 0) {
        console.log('Nenhum backup encontrado');
      } else {
        backups.forEach((backup, index) => {
          console.log(`${index + 1}. ${backup.filename}`);
          console.log(`   Tamanho: ${backup.sizeFormatted}`);
          console.log(`   Criado: ${backup.created.toLocaleString('pt-BR')}`);
          console.log('');
        });
      }
      break;
      
    case 'stats':
      console.log('Estatísticas dos backups:');
      const stats = backupManager.getBackupStats();
      console.log(`Total de backups: ${stats.count}`);
      console.log(`Tamanho total: ${stats.totalSizeFormatted}`);
      console.log(`Diretório: ${stats.backupDir}`);
      console.log(`Máximo de backups: ${stats.maxBackups}`);
      console.log(`Agendamento: ${stats.schedule}`);
      if (stats.newestBackup) {
        console.log(`Backup mais recente: ${stats.newestBackup.toLocaleString('pt-BR')}`);
      }
      if (stats.oldestBackup) {
        console.log(`Backup mais antigo: ${stats.oldestBackup.toLocaleString('pt-BR')}`);
      }
      break;
      
    case 'restore':
      const backupFilename = process.argv[3];
      if (!backupFilename) {
        console.error('Uso: node backup.js restore <nome_do_backup>');
        process.exit(1);
      }
      console.log(`Restaurando backup: ${backupFilename}`);
      backupManager.restoreBackup(backupFilename)
        .then(result => {
          console.log('Restauração concluída:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Erro na restauração:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Uso:');
      console.log('  node backup.js backup    - Criar backup manual');
      console.log('  node backup.js list      - Listar backups');
      console.log('  node backup.js stats     - Mostrar estatísticas');
      console.log('  node backup.js restore <arquivo> - Restaurar backup');
      break;
  }
}