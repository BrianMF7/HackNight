import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isErrorShape } from '@/api/ApiError';
import { appParams } from '@/lib/app-params';

/**
 * @typedef {import('@base44/sdk').User} AuthUser
 * @typedef {import('@base44/sdk').AppPublicSettingsResponse} PublicSettings
 * @typedef {{ type: string, message?: string }} AuthErrorInfo
 * @typedef {{
 *   user: AuthUser | null,
 *   isAuthenticated: boolean,
 *   isLoadingAuth: boolean,
 *   isLoadingPublicSettings: boolean,
 *   authError: AuthErrorInfo | null,
 *   appPublicSettings: PublicSettings | null,
 *   authChecked: boolean,
 *   logout: (shouldRedirect?: boolean) => void,
 *   navigateToLogin: () => void,
 *   checkUserAuth: () => Promise<void>,
 *   checkAppState: () => Promise<void>,
 * }} AuthState
 */

const AuthContext = createContext(/** @type {AuthState | undefined} */ (undefined));

/** @param {{ children?: React.ReactNode }} props */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(/** @type {AuthUser | null} */ (null));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(/** @type {AuthErrorInfo | null} */ (null));
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(/** @type {PublicSettings | null} */ (null)); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        const failure = isErrorShape(appError) ? appError : null;

        // Handle app-level errors
        if (failure && failure.status === 403 && failure.data?.extra_data?.reason) {
          const reason = failure.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: failure.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: (failure && failure.message) || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: (isErrorShape(error) && error.message) || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (isErrorShape(error) && (error.status === 401 || error.status === 403)) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    // SDK logout always navigates to Base44, which sends people to app.base44.com.
    try {
      window.localStorage.removeItem("base44_access_token");
      window.localStorage.removeItem("token");
    } catch {
      // Storage can throw in private mode.
    }
    if (shouldRedirect) window.location.assign("/");
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
