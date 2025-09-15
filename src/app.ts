import "./styles.css";

document.querySelectorAll("a").forEach((a) => {
	a.addEventListener("click", (e) => {
		e.preventDefault();
		a.remove();
	});
});
