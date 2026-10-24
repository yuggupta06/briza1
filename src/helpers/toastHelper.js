import toast from 'react-hot-toast';
const toastIcon = (emailMessage) => {
    return new Promise((resolve) => {
      toast.success(emailMessage, {
        duration: 1000, // toast duration in ms
        position: 'top-center',
      });

      setTimeout(() => {
        resolve(void 0);
      }, 1000); // 
    });
  };

export default toastIcon;