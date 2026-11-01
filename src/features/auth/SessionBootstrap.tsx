import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { configureApiClient } from '../../services/apiClient';
import { useUserStore } from '../../store/userStore';

export default function SessionBootstrap() {
  const navigate = useNavigate();

  useEffect(() => {
    configureApiClient({
      getToken: () => useUserStore.getState().token,
      onUnauthorized: () => {
        useUserStore.getState().logout();
        navigate('/login', { replace: true });
      },
    });
    void useUserStore.getState().initializeSession();
  }, [navigate]);

  return null;
}
