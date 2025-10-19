# Android App Widget Implementation Guide

## 1. 파일 구조

```
android/app/src/main/
├── res/
│   ├── layout/
│   │   └── inner_note_widget.xml
│   ├── xml/
│   │   └── inner_note_widget_info.xml
│   └── drawable/
│       └── widget_background.xml
├── java/com/wodnjs3418/testapp/
│   └── InnerNoteWidgetProvider.java
└── AndroidManifest.xml
```

## 2. Widget Layout (res/layout/inner_note_widget.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/widget_background">

    <!-- 헤더 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="8dp">

        <ImageView
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:src="@drawable/ic_heart"
            android:tint="#7C3AED" />

        <View
            android:layout_width="0dp"
            android:layout_height="1dp"
            android:layout_weight="1" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="INNER NOTE"
            android:textSize="10sp"
            android:textColor="#64748B"
            android:fontFamily="sans-serif-medium" />

    </LinearLayout>

    <!-- 메인 메시지 -->
    <TextView
        android:id="@+id/widget_message"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:text="오늘 한 줄을 기록해보세요 ✨"
        android:textSize="14sp"
        android:textColor="#1E293B"
        android:fontFamily="sans-serif-medium"
        android:gravity="start"
        android:maxLines="3"
        android:ellipsize="end" />

    <!-- 하단 액션 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginTop="8dp">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="탭해서 기록하기"
            android:textSize="10sp"
            android:textColor="#64748B" />

        <ImageView
            android:layout_width="16dp"
            android:layout_height="16dp"
            android:src="@drawable/ic_edit"
            android:tint="#7C3AED" />

    </LinearLayout>

</LinearLayout>
```

## 3. Widget Info (res/xml/inner_note_widget_info.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="14400000"
    android:initialLayout="@layout/inner_note_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@drawable/widget_preview"
    android:description="@string/widget_description">
</appwidget-provider>
```

## 4. Widget Background (res/drawable/widget_background.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <gradient
        android:startColor="#F8FAFC"
        android:endColor="#F1F5F9"
        android:angle="135" />
    <corners android:radius="16dp" />
    <stroke
        android:width="1dp"
        android:color="#E2E8F0" />
</shape>
```

## 5. Widget Provider (InnerNoteWidgetProvider.java)

```java
package com.wodnjs3418.testapp;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.net.Uri;

public class InnerNoteWidgetProvider extends AppWidgetProvider {

    private static final String[] MESSAGES = {
        "오늘 한 줄을 기록해보세요 ✨",
        "마음을 정리할 시간이에요 💙", 
        "감정을 기록하고 위로받아요 🤗",
        "오늘 하루는 어땠나요? 📝",
        "잠깐의 기록이 큰 변화를 만들어요 🌟"
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // 랜덤 메시지 선택
        int messageIndex = (int) (System.currentTimeMillis() / (4 * 60 * 60 * 1000)) % MESSAGES.length;
        String message = MESSAGES[messageIndex];

        // RemoteViews 생성
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.inner_note_widget);
        views.setTextViewText(R.id.widget_message, message);

        // 앱 열기 인텐트
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("innernotequickwrite://widget"));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            appWidgetId, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        // 위젯 업데이트
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
        // 첫 번째 위젯이 생성될 때
    }

    @Override
    public void onDisabled(Context context) {
        // 마지막 위젯이 제거될 때
    }
}
```

## 6. AndroidManifest.xml 수정

```xml
<!-- 기존 application 태그 내부에 추가 -->
<receiver android:name=".InnerNoteWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data android:name="android.appwidget.provider"
        android:resource="@xml/inner_note_widget_info" />
</receiver>

<!-- URL scheme 처리용 intent-filter 추가 (MainActivity에) -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="innernotequickwrite" />
</intent-filter>
```

## 7. 리소스 파일들

### res/values/strings.xml에 추가
```xml
<string name="widget_description">INNER NOTE 빠른 기록</string>
```

### 아이콘 파일들 추가
- res/drawable/ic_heart.xml
- res/drawable/ic_edit.xml
- res/drawable/widget_preview.png

## 8. React Native에서 위젯 클릭 처리

```javascript
import { Linking } from 'react-native';

// App.js에서
useEffect(() => {
  // 앱 시작 시 URL 체크
  Linking.getInitialURL().then(url => {
    if (url && url.includes('innernotequickwrite')) {
      // 위젯에서 열림 - 홈 탭으로 이동하고 입력창 포커스
      setCurrentTab('home');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
    }
  });

  // 앱 실행 중 URL 처리
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (url.includes('innernotequickwrite')) {
      setCurrentTab('home');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
    }
  });

  return () => subscription?.remove();
}, []);
```

## 빌드 및 테스트

1. `npx expo run:android`로 빌드
2. 홈화면에서 위젯 추가
3. 위젯 클릭으로 앱 열기 테스트
4. 4시간마다 메시지 변경 확인