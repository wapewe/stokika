document.addEventListener('DOMContentLoaded', async () => {
    await authMiddleware.protectPage(['admin']);
});
