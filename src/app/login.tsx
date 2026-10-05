import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthHeader, AuthScreen, Field, InlineLink, PrimaryButton } from '@/components/auth-ui';
import { useAppState } from '@/components/app-state';
import { login } from '@/services/auth-api';
import { loginStyles } from '@/styles/login.styles';

export default function LoginScreen() {
  const { setAuthenticatedUser } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      setAuthenticatedUser(user);
      router.replace('/app-home');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Entrar" />
      <View style={loginStyles.content}>
        <Text style={loginStyles.title}>Bem-vinda de volta</Text>
        <View style={loginStyles.form}>
          <Field label="E-MAIL" placeholder="voce@email.com" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
          <Field label="SENHA" placeholder="••••••••" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} />
          {error ? <Text accessibilityRole="alert" style={{ color: '#a33228' }}>{error}</Text> : null}
          <PrimaryButton label={submitting ? 'ENTRANDO...' : 'ENTRAR'} onPress={handleLogin} disabled={submitting} />
        </View>
        <InlineLink label="Criar uma conta" onPress={() => router.push('/signup')} />
      </View>
    </AuthScreen>
  );
}

