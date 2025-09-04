import Client from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';

async function uploadDirectory(sftp, localDir, remoteDir) {
    const files = fs.readdirSync(localDir);
    
    for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = path.join(remoteDir, file).replace(/\\/g, '/');
        const stat = fs.statSync(localPath);
        
        if (stat.isDirectory()) {
            try {
                await sftp.mkdir(remotePath, true);
                await uploadDirectory(sftp, localPath, remotePath);
            } catch (err) {
                console.error(`Erro ao criar diretório ${remotePath}:`, err);
                throw err;
            }
        } else {
            try {
                console.log(`Uploading ${localPath} to ${remotePath}`);
                await sftp.put(localPath, remotePath);
            } catch (err) {
                console.error(`Erro ao enviar arquivo ${localPath}:`, err);
                throw err;
            }
        }
    }
}

async function deploy() {
    const sftp = new Client();
    const remoteDir = '/home/u461960397/domains/xml.lojasrealce.shop/public_html';
    
    try {
        await sftp.connect({
            host: 'xml.lojasrealce.shop',
            port: 22,
            username: 'root',
            password: 'Pedrojr.xp1@'
        });
        
        console.log("Conectado ao servidor SFTP");
        
        // Limpar diretório remoto
        try {
            const remoteFiles = await sftp.list(remoteDir);
            for (const file of remoteFiles) {
                const remotePath = `${remoteDir}/${file.name}`;
                if (file.type === 'd') {
                    await sftp.rmdir(remotePath, true);
                } else {
                    await sftp.delete(remotePath);
                }
            }
            console.log("Diretório remoto limpo");
        } catch (err) {
            console.error("Erro ao limpar diretório remoto:", err);
            // Continuar mesmo se o diretório estiver vazio
        }
        
        // Upload dos arquivos
        await uploadDirectory(sftp, "./dist", remoteDir);
        console.log("Upload concluído com sucesso!");
        
        // Recarregar nginx
        const { exec } = await import('child_process');
        exec('ssh root@82.29.58.242 "systemctl reload nginx"', (error, stdout, stderr) => {
            if (error) {
                console.error('Erro ao recarregar nginx:', error);
                return;
            }
            console.log('Nginx recarregado com sucesso');
        });
        
    } catch(err) {
        console.error("Erro durante o deploy:", err);
        throw err;
    } finally {
        await sftp.end();
    }
}

deploy();