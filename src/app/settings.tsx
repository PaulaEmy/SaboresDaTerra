import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AuthHeader, AuthScreen, Field, PrimaryButton } from '@/components/auth-ui';
import { useAppState } from '@/components/app-state';
import { changePassword, getRecommendations } from '@/services/auth-api';
import { cancelDailyRecipeSuggestions, hasDailyRecipeSuggestion, scheduleDailyRecipeSuggestion } from '@/services/recipe-notifications';
import { profileStyles as styles } from '@/styles/profile.styles';

export default function SettingsScreen() {
  const { user } = useAppState();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    let active = true;
    hasDailyRecipeSuggestion()
      .then((enabled) => { if (active) setNotificationsEnabled(enabled); })
      .catch((notificationError: unknown) => {
        if (active) setError(notificationError instanceof Error ? notificationError.message : 'Não foi possível consultar notificações.');
      });
    return () => { active = false; };
  }, []);

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

  async function toggleRecipeNotifications() {
    if (notificationBusy) return;
    setError('');
    setMessage('');
    setNotificationBusy(true);
    try {
      if (notificationsEnabled) {
        await cancelDailyRecipeSuggestions();
        setNotificationsEnabled(false);
        setMessage('Sugestões diárias desativadas.');
      } else {
        if (!user) throw new Error('Entre na sua conta para ativar sugestões personalizadas.');
        const recommendations = await getRecommendations();
        if (!recommendations.length) throw new Error('Escolha preferências e restrições compatíveis no perfil antes de ativar sugestões.');
        await scheduleDailyRecipeSuggestion(recommendations[0]);
        setNotificationsEnabled(true);
        setMessage('Uma sugestão será enviada diariamente às 10h. Toque nela para abrir a receita.');
      }
    } catch (notificationError) {
      setError(notificationError instanceof Error ? notificationError.message : 'Não foi possível atualizar as notificações.');
    } finally {
      setNotificationBusy(false);
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
        <Text style={styles.settingsTitle}>Sugestões de receitas</Text>
        <Text style={styles.settingsDescription}>Ative uma notificação local diária, às 10h, com uma receita compatível com suas preferências. Toque na notificação para abrir a receita. O agendamento funciona no app Android/iOS; notificações push remotas não estão configuradas.</Text>
        <Pressable
          accessibilityRole="button"
          disabled={notificationBusy || Platform.OS === 'web'}
          onPress={() => void toggleRecipeNotifications()}
          style={[styles.notificationButton, (notificationBusy || Platform.OS === 'web') && styles.disabledButton]}>
          <Text style={styles.notificationButtonText}>
            {notificationBusy ? 'ATUALIZANDO...' : notificationsEnabled ? 'DESATIVAR SUGESTÕES DIÁRIAS' : 'ATIVAR SUGESTÕES DIÁRIAS'}
          </Text>
        </Pressable>
        {Platform.OS === 'web' ? <Text style={styles.settingsDescription}>Notificações estão disponíveis no aplicativo nativo para Android e iOS.</Text> : null}
      </View>
    </AuthScreen>
  );
}