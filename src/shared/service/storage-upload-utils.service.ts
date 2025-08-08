import { Storage } from '@google-cloud/storage';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageUploadUtilsService {
  private logger = new Logger(StorageUploadUtilsService.name);

  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const root = process.cwd();
    const keyFilename = path.join(
      root,
      'methodical-bank-248219-cf3270ce95ed.json',
    );

    // Configuração da autenticação do Google Cloud Storage
    this.storage = new Storage({
      keyFilename,
    });

    this.bucketName = this.configService.getOrThrow<string>(
      'GOOGLE_CLOUD_STORAGE_BUCKET_NAME',
    );
  }

  async zipFile(filePath: string): Promise<string> {
    const zip = new AdmZip();
    zip.addLocalFile(filePath);

    const zipFilePath = `${filePath}.zip`;
    await fs.writeFile(zipFilePath, zip.toBuffer());

    this.logger.log(`Arquivo compactado: ${zipFilePath}`);
    return zipFilePath;
  }

  async uploadToStorage(body: {
    apiKey: string;
    filePath: string;
    referenceDate: string;
  }) {
    const { apiKey, filePath, referenceDate } = body;
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const fileName = path.basename(filePath);

      const destination = `${apiKey}/${referenceDate}/${fileName}`;

      //ex "34234234-34234/2023-01-01/clients_marketing.csv"

      await bucket.upload(filePath, {
        destination,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      this.logger.debug(
        `Upload concluído: ${filePath} -> gs://${this.bucketName}/${destination}`,
      );

      return `https://storage.googleapis.com/${this.bucketName}/${destination}`;
    } catch (error) {
      this.logger.error(
        `Erro ao fazer upload para o Storage: ${error.message}`,
      );
      throw new Error(`Erro no upload: ${error.message}`);
    }
  }

  // Remove o prefixo do bucket da URL completa, retornando apenas o caminho relativo do arquivo
  getRelativeFilePath(fullUrl: string): string {
    const url = new URL(fullUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.slice(1).join('/');
  }

  /**
   * Gera uma URL assinada para um arquivo no GCS com expiração de 15 minutos
   * @param filePath Caminho relativo no bucket (ex: apiKey/data/file.csv)
   */
  async signedUrlWithExpiration(filePath: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutos
      });

      return url;
    } catch (error) {
      this.logger.error(`Erro ao gerar URL assinada: ${error.message}`);
      throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
    }
  }

  /**
   * Lista arquivos dentro de um "diretório" no bucket
   * @param folderPrefix Prefixo da pasta (Ex: "meu-diretorio/")
   */
  async listFiles(folderPrefix?: string) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles();

      if (!files.length) {
        this.logger.warn(
          ` Nenhum arquivo encontrado em gs://${this.bucketName}/${folderPrefix}`,
        );
        return [];
      }

      this.logger.log(
        `Arquivos encontrados (${files.length}) em gs://${this.bucketName}/${folderPrefix}:`,
      );
      return files.map((file) => ({
        name: file.name,
        url: `https://storage.googleapis.com/${this.bucketName}/${file.name}`,
      }));
    } catch (error) {
      this.logger.error(`Erro ao listar arquivos do Storage: ${error.message}`);
      throw new Error(`Erro na listagem: ${error.message}`);
    }
  }

  async verifyFileExists(filePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      const [exists] = await file.exists();

      if (!exists) {
        this.logger.warn(
          `Arquivo não encontrado: gs://${this.bucketName}/${filePath}`,
        );
        return false;
      }

      this.logger.log(
        `Arquivo encontrado: gs://${this.bucketName}/${filePath}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar arquivo no Storage: ${error.message}`,
      );
      throw new Error(`Erro na verificação: ${error.message}`);
    }
  }

  async deleteFromStorage(filePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      const [exists] = await file.exists();

      if (!exists) {
        this.logger.warn(
          `Arquivo não encontrado: gs://${this.bucketName}/${filePath}`,
        );
        return false; // Indica que o arquivo não existia
      }

      // Deleta o arquivo
      await file.delete();

      this.logger.log(
        `Arquivo deletado com sucesso: gs://${this.bucketName}/${filePath}`,
      );
      return true; // Indica que o arquivo foi deletado com sucesso
    } catch (error) {
      this.logger.error(`Erro ao deletar arquivo do Storage: ${error.message}`);
      throw new Error(`Erro no delete: ${error.message}`);
    }
  }
}
