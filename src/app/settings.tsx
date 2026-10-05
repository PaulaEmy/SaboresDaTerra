import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthHeader, AuthScreen, Field, PrimaryButton } from '@/components/auth-ui';
import { changePassword } from '@/services/auth-api';
import { profileStyles as styles } from '@/styles/profile.styles';

export default function SettingsScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordChange() {
    if (submitting) return;
    if (newPassword !== passwordConfirmation) {
      setError('As novas senhas não coincidem.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Não foi possível alterar a senha.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Configurações" />
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>Segurança</Text>
        <Text style={styles.settingsDescription}>Altere a senha da sua conta.</Text>
        <Field label="SENHA ATUAL" placeholder="Sua senha atual" secureTextEntry autoComplete="current-password" value={currentPassword} onChangeText={setCurrentPassword} />
        <Field label="NOVA SENHA" placeholder="Mínimo de 8 caracteres" secureTextEntry autoComplete="new-password" value={newPassword} onChangeText={setNewPassword} />
        <Field label="CONFIRMAR NOVA SENHA" placeholder="Repita a nova senha" secureTextEntry autoComplete="new-password" value={passwordConfirmation} onChangeText={setPasswordConfirmation} />
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        {message ? <Text accessibilityRole="alert" style={styles.successText}>{message}</Text> : null}
        <PrimaryButton label={submitting ? 'SALVANDO...' : 'ALTERAR SENHA'} onPress={handlePasswordChange} disabled={submitting} />
      </View>
    </AuthScreen>
  );
}