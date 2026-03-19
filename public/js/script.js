document.addEventListener('DOMContentLoaded', () => {
    const signInGarageButton = document.getElementById('signInGarage');
    const signInUserButton = document.getElementById('signInUser');
    const container = document.getElementById('container');

    signInGarageButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });

    signInUserButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });
});