import 'package:bluefeather/firebase_options.dart';
import 'package:bluefeather/log/logger.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  Logger.log('Handling a background message: ${message.messageId}');
  Logger.log('Message data: ${message.data}');
  Logger.log('Message notification: ${message.notification}');
  Logger.log('Message sent time: ${message.sentTime}');
}

class FirebaseClient {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  // Notification messages which arrive whilst the application is in the foreground will not display a visible notification by default
  // This is required to override the default behavior and display a visible notification
  static AndroidNotificationChannel channel = const AndroidNotificationChannel(
    'high_importance_channel',
    'High Importance Notifications',
    description: 'This channel is used for important notifications.',
    importance: Importance.max,
  );

  static FlutterLocalNotificationsPlugin localNotifications =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    // Initialize Firebase
    WidgetsFlutterBinding.ensureInitialized();
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Request permission for receiving notifications
    NotificationSettings settings = await _messaging.requestPermission(
        alert: true, badge: true, sound: true);
    Logger.log('User granted permission: ${settings.authorizationStatus}');

    // If the user did not grant permission, do not continue
    if (settings.authorizationStatus != AuthorizationStatus.authorized) return;

    // Override the default behavior and display a visible notification
    await localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // Handle foreground notifications
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      Logger.log('Got a message whilst in the foreground!');
      Logger.log('Message data: ${message.data}');

      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        Logger.log(
            'Message also contained a notification: ${message.notification}');

        localNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              channel.id,
              channel.name,
              channelDescription: channel.description,
              icon: '@drawable/ic_launcher',
            ),
          ),
        );
      }
    });

    // Handle background notifications
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }
}
