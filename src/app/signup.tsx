import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthHeader, AuthScreen, Field, PrimaryButton } from '@/components/auth-ui';
import { register } from '@/services/auth-api';
import { signupStyles } from '@/styles/signup.styles';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    if (submitting) return;
    if (password !== passwordConfirmation) {
      setError('As senhas não coincidem.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.push({ pathname: '/confirmation', params: { email: email.trim() } });
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Não foi possível criar seu cadastro.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Cadastrar" />
      <View style={signupStyles.content}>
        <Text style={signupStyles.title}>Sua cozinha começa aqui</Text>
        <View style={signupStyles.form}>
          <Field label="NOME" placeholder="Maria Luísa" autoCapitalize="words" autoComplete="name" value={name} onChangeText={setName} />
          <Field label="E-MAIL" placeholder="voce@email.com" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
          <Field label="SENHA" placeholder="••••••••" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} />
          <Field label="CONFIRMAR SENHA" placeholder="••••••••" secureTextEntry autoComplete="new-password" value={passwordConfirmation} onChangeText={setPasswordConfirmation} />
          {error ? <Text accessibilityRole="alert" style={{ color: '#a33228' }}>{error}</Text> : null}
          <PrimaryButton label={submitting ? 'ENVIANDO...' : 'CRIAR CONTA'} onPress={handleSignup} disabled={submitting} />
        </View>
      </View>
    </AuthScreen>
  );
}

