
export const handleShare = async () => {

        const postUrl = window.location.href; // or your dynamic post link
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: "Check this post!",
                text: "Found something cool 🤩",
                url: postUrl,
            });
        } catch (err) {
            console.error("Share cancelled or failed:", err);
        }
    } else {
        // Fallback if not supported
        alert("Sharing not supported on this browser");
    }
};