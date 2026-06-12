import CryptoJS from 'crypto-js';

/**
 * 加密存储类 - 基于 crypto-js 的 localStorage 加密解密方案
 */
class EncryptedStorage {
  private secretKey: string;
  private prefix: string;

  /**
   * 初始化加密存储
   * @param secretKey - 加密密钥（建议使用环境变量）
   * @param prefix - localStorage key 前缀（可选，默认为 'es_'）
   */
  constructor(secretKey: string='storage-encrypt-key', prefix: string = 'es_') {
    if (!secretKey || secretKey.trim() === '') {
      throw new Error('Secret key cannot be empty');
    }
    this.secretKey = secretKey;
    this.prefix = prefix;
  }

  /**
   * 生成完整的 storage key
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 加密数据
   */
  private encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.secretKey).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 解密数据
   */
  private decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Decryption resulted in empty string');
      }
      
      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 存储数据（自动加密）
   * @param key - 存储键
   * @param value - 要存储的值（支持对象、数组等）
   */
  setItem<T>(key: string, value: T): void {
    try {
      const jsonString = JSON.stringify(value);
      const encryptedValue = this.encrypt(jsonString);
      localStorage.setItem(this.getFullKey(key), encryptedValue);
    } catch (error) {
      console.error(`Failed to set item with key: ${key}`, error);
      throw error;
    }
  }

  /**
   * 获取数据（自动解密）
   * @param key - 存储键
   * @returns 解密后的数据，如果不存在返回 null
   */
  getItem<T>(key: string): T | null {
    try {
      const encryptedValue = localStorage.getItem(this.getFullKey(key));
      
      if (encryptedValue === null) {
        return null;
      }
      
      const decryptedValue = this.decrypt(encryptedValue);
      
      // 尝试解析 JSON，失败则返回字符串
      try {
        return JSON.parse(decryptedValue);
      } catch {
        return decryptedValue as T;
      }
    } catch (error) {
      console.error(`Failed to get item with key: ${key}`, error);
      return null;
    }
  }

  /**
   * 移除数据
   * @param key - 存储键
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.getFullKey(key));
    } catch (error) {
      console.error(`Failed to remove item with key: ${key}`, error);
      throw error;
    }
  }

  /**
   * 清空所有加密存储的数据
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear storage', error);
      throw error;
    }
  }

  /**
   * 获取所有加密存储的键
   */
  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.replace(this.prefix, ''));
      }
    }
    return keys;
  }

  /**
   * 获取存储的项数
   */
  get length(): number {
    return this.keys().length;
  }

  /**
   * 检查键是否存在
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(this.getFullKey(key)) !== null;
  }
}

export default EncryptedStorage;