import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthHeader, AuthScreen, InlineLink, PrimaryButton } from '@/components/auth-ui';
import { resendVerification } from '@/services/auth-api';
import { confirmationStyles } from '@/styles/confirmation.styles';

export default function ConfirmationScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleResend() {
    if (!email || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await resendVerification(email);
      setMessage(result.message);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Não foi possível reenviar o link.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Confirmação" />
      <View style={confirmationStyles.content}>
        <View style={confirmationStyles.iconBox}>
          <Text style={confirmationStyles.icon}>✉</Text>
        </View>
        <Text style={confirmationStyles.title}>Confirme seu e-mail</Text>
        <Text style={confirmationStyles.description}>
          Enviamos um link de confirmação para o seu{ '\n' }e-mail. Verifique também a caixa de spam.
        </Text>
        {message ? <Text accessibilityRole="alert">{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: '#a33228' }}>{error}</Text> : null}
        <View style={confirmationStyles.actions}>
          <PrimaryButton label="IR PARA ENTRAR" onPress={() => router.replace('/login')} />
          <InlineLink label={submitting ? 'Enviando...' : 'Reenviar link'} onPress={handleResend} />
        </View>
      </View>
    </AuthScreen>
  );
}

