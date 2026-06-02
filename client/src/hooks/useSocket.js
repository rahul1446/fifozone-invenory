import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/notificationSlice';
import { notification } from 'antd';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to server (proxied or direct origin)
    const socket = io(window.location.origin || 'http://localhost:5000', {
      transports: ['websocket'],
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Join staff notifications room
      socket.emit('join_room', 'staff');
      console.log('Real-time notification socket connected');
    });

    // Capture incoming warnings & updates
    socket.on('new_notification', (data) => {
      // 1. Dispatch to global Redux notifications lists
      dispatch(addNotification(data));

      // 2. Trigger clean premium Ant Design floating alert
      let type = 'info';
      if (data.severity === 'error') type = 'error';
      if (data.severity === 'warning') type = 'warning';
      if (data.severity === 'success') type = 'success';

      notification[type]({
        message: data.title,
        description: data.message,
        placement: 'topRight',
        duration: 5
      });
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [isAuthenticated, user, dispatch]);

  return socketRef.current;
};
