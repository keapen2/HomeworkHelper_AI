// screens/LoginScreen.js
// Unified login screen for both admin and user
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { triggerHaptic } from '../utils/haptics';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const styles = getStyles(theme);

  // Clear fields when component mounts (e.g., after logout)
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check email to determine role (for routing before claims are set)
      const adminEmails = ['kiraneapen2006@gmail.com'];
      const userEmails = ['nateandbros@gmail.com'];
      
      let isAdminByEmail = adminEmails.includes(email.toLowerCase());
      let isUserByEmail = userEmails.includes(email.toLowerCase());
      
      // Get user token to check claims
      const token = await user.getIdTokenResult(true); // Force refresh to get latest claims
      const isAdminByClaim = token.claims.admin === true;
      const roleFromClaim = token.claims.role;
      
      // Determine role: prefer claims, fallback to email check
      let role;
      if (roleFromClaim) {
        role = roleFromClaim;
      } else if (isAdminByClaim) {
        role = 'admin';
      } else if (isAdminByEmail) {
        role = 'admin';
      } else if (isUserByEmail) {
        role = 'student';
      } else {
        // Default to student if can't determine
        role = 'student';
      }
      
      // If claims don't match email-based role, we should set them (but that requires backend)
      // For now, the email check will work for routing
      console.log('Login - Email:', email, 'Role determined:', role);
      
      triggerHaptic('success');
      toast.showSuccess('Login successful!');
      
      // Clear fields after successful login
      setEmail('');
      setPassword('');
      
      // Navigation is handled by AppNavigator based on auth state and role
      // The role will be checked from token claims or email
    } catch (error) {
      console.error('Login error:', error);
      triggerHaptic('error');
      toast.showError(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    triggerHaptic('light');
    setResetEmail(email || ''); // Pre-fill with entered email if available
    setShowResetModal(true);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      triggerHaptic('success');
      toast.showSuccess('Password reset email sent! Check your inbox.');
      setShowResetModal(false);
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      triggerHaptic('error');
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      toast.showError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>H</Text>
          </View>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>HomeworkHelper</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity 
                onPress={handleForgotPassword}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Admin and student accounts use the same login
          </Text>
        </View>
      </View>

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalDescription}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!resetLoading}
                  autoFocus
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    triggerHaptic('light');
                    setShowResetModal(false);
                    setResetEmail('');
                  }}
                  disabled={resetLoading}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonReset, resetLoading && styles.modalButtonDisabled]}
                  onPress={handlePasswordReset}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalButtonResetText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  logoContainer: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md + 2,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.borderLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalButtonReset: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonResetText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});

