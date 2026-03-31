import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
      const clientEmail = this.configService.get<string>(
        "FIREBASE_CLIENT_EMAIL",
      );
      const privateKey = this.configService
        .get<string>("FIREBASE_PRIVATE_KEY")
        ?.replace(/\\n/g, "\n");

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          "Firebase credentials missing. Push notifications will not work.",
        );
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.logger.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", error);
    }
  }

  async sendPush(
    token: string,
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn(
        "Firebase App not initialized. Skipping push notification.",
      );
      return;
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data ? this.sanitizeData(data) : {},
        token,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(
        `Push notification sent successfully to token: ${token.substring(0, 10)}...`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to token: ${token.substring(0, 10)}...`,
        error,
      );
      throw error;
    }
  }

  private sanitizeData(data: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        sanitized[key] = String(data[key]);
      }
    }
    return sanitized;
  }
}
