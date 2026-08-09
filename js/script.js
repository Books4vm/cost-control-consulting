const menuToggle = document.querySelector(".menu-toggle");
const primaryMenu = document.querySelector(".primary-menu");

if (menuToggle && primaryMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = primaryMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  primaryMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      primaryMenu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}
