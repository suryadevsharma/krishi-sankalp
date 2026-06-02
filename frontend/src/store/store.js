import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  activeCycleId: localStorage.getItem('activeCycleId') ? parseInt(localStorage.getItem('activeCycleId')) : null,
  offlineQueue: JSON.parse(localStorage.getItem('offlineQueue')) || [],
  
  // Initialize user from token
  initAuth: async () => {
    const token = get().token;
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const res = await axios.get(`${API_URL}/api/auth/me`);
        set({ user: res.data });
      } catch (err) {
        console.error("Token invalid or expired. Logging out.");
        get().logout();
      }
    }
  },
  
  login: (token, user) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token, user });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeCycleId');
    delete axios.defaults.headers.common['Authorization'];
    set({ token: null, user: null, activeCycleId: null });
  },
  
  setActiveCycleId: (id) => {
    if (id) {
      localStorage.setItem('activeCycleId', id.toString());
    } else {
      localStorage.removeItem('activeCycleId');
    }
    set({ activeCycleId: id });
  },
  
  // Offline-First PWA Queue
  addToOfflineQueue: (item) => {
    const newQueue = [...get().offlineQueue, { ...item, id: Date.now() }];
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
    set({ offlineQueue: newQueue });
  },
  
  removeFromOfflineQueue: (id) => {
    const newQueue = get().offlineQueue.filter(item => item.id !== id);
    localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
    set({ offlineQueue: newQueue });
  },
  
  syncOfflineQueue: async () => {
    if (!navigator.onLine || get().offlineQueue.length === 0) return;
    
    console.log("Internet restored. Syncing offline disease reports...");
    const queue = get().offlineQueue;
    
    for (const item of queue) {
      try {
        const formData = new FormData();
        // Since image was stored as base64 string offline, convert back to file blob
        const blob = await fetch(item.imageBase64).then(res => res.blob());
        formData.append('image', blob, 'offline_leaf_image.jpg');
        
        if (item.cropCycleId) {
          formData.append('crop_cycle_id', item.cropCycleId);
        }
        formData.append('lat', item.lat);
        formData.append('lon', item.lon);
        
        await axios.post(`${API_URL}/api/disease/detect`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        get().removeFromOfflineQueue(item.id);
        console.log(`Synced report: ${item.id}`);
      } catch (err) {
        console.error(`Failed to sync report ${item.id}`, err);
      }
    }
  }
}));

// Listen for network connectivity to automatically sync offline queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useStore.getState().syncOfflineQueue();
  });
}
