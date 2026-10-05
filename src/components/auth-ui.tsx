import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { authUiStyles } from '@/styles/auth-ui.styles';

export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <View style={authUiStyles.screen}>
      <SafeAreaView style={authUiStyles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={authUiStyles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={authUiStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AuthHeader({ title }: { title: string }) {
  return (
    <View style={authUiStyles.header}>
      <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={authUiStyles.backButton}>
        <Text style={authUiStyles.backArrow}>‹</Text>
      </Pressable>
      <Text style={authUiStyles.headerTitle}>{title}</Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(props.secureTextEntry);

  return (
    <View style={authUiStyles.fieldGroup}>
      <Text style={authUiStyles.label}>{label}</Text>
      <View style={authUiStyles.inputWrapper}>
        <TextInput
          {...props}
          secureTextEntry={isPassword ? !passwordVisible : props.secureTextEntry}
          placeholderTextColor={Colors.muted}
          style={[authUiStyles.input, isPassword && authUiStyles.inputWithToggle, props.style]}
          autoCapitalize={props.autoCapitalize ?? 'none'}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={authUiStyles.passwordToggle}>
            <Text style={authUiStyles.passwordToggleText}>{passwordVisible ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [authUiStyles.primaryButton, pressed && authUiStyles.pressed, disabled && { opacity: 0.55 }]}>
      <Text style={authUiStyles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function InlineLink({ label, onPress, light = false }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Pressable onPress={onPress} style={authUiStyles.inlineLinkPressable}>
      <Text style={[authUiStyles.inlineLink, light && authUiStyles.inlineLinkLight]}>{label}</Text>
    </Pressable>
  );
}
