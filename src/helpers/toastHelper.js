import toast from 'react-hot-toast';
const toastIcon = (emailMessage) => {
    return new Promise((resolve) => {
      toast.success(emailMessage, {
        duration: 3000, // toast duration in ms
        position: 'top-center',
      });

      setTimeout(() => {
        resolve(void 0);
      }, 3000); // 
    });
  };

export default toastIcon;