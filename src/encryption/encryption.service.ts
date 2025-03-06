import { Injectable } from '@nestjs/common';
import * as sodium from 'libsodium-wrappers';

@Injectable()
export class EncryptionService {
  private async initSodium() {
    await sodium.ready;
    return sodium;
  }

  async generateKeyPair() {
    const sodium = await this.initSodium();
    const keyPair = sodium.crypto_box_keypair();

    return {
      publicKey: sodium.to_base64(keyPair.publicKey),
      secretKey: sodium.to_base64(keyPair.privateKey),
    };
  }

  async encryptMessage(
    senderSecretKey: string,
    recipientPublicKey: string,
    message: string,
  ) {
    const sodium = await this.initSodium();

    // Add detailed validation
    console.log('Encrypting message:', {
      messageLength: message?.length,
      hasSecretKey: !!senderSecretKey,
      hasPublicKey: !!recipientPublicKey,
    });

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }
    if (!recipientPublicKey) {
      throw new Error('Recipient public key is required');
    }
    if (!senderSecretKey) {
      throw new Error('Sender secret key is required');
    }

    try {
      const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

      const encryptedMessage = sodium.crypto_box_easy(
        message,
        nonce,
        sodium.from_base64(recipientPublicKey),
        sodium.from_base64(senderSecretKey),
      );

      return {
        encryptedMessage: sodium.to_base64(encryptedMessage),
        nonce: sodium.to_base64(nonce),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message: ' + error.message);
    }
  }

  async decryptMessage(
    recipientSecretKey: string,
    senderPublicKey: string,
    encryptedMessage: string,
    nonce: string,
  ): Promise<string> {
    const sodium = await this.initSodium();

    try {
      const decryptedMessage = sodium.crypto_box_open_easy(
        sodium.from_base64(encryptedMessage),
        sodium.from_base64(nonce),
        sodium.from_base64(senderPublicKey),
        sodium.from_base64(recipientSecretKey),
      );

      return sodium.to_string(decryptedMessage);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }
}
