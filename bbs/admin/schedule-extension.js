const renderApplicationsWithoutSchedule = renderApplications;

renderApplications = function renderApplicationsWithSchedule() {
  renderApplicationsWithoutSchedule();
  const query = state.query.toLowerCase();
  const items = state.applications.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  const cards = document.querySelectorAll("#applicationsPanel .card");

  cards.forEach((card, index) => {
    const item = items[index];
    if (!item) return;
    const avatar = card.querySelector(".avatar");
    if (avatar) avatar.textContent = String(items.length - index);
    card.querySelector(".card-body")?.remove();
    card.querySelector(".detail-button")?.remove();
    const genderValue = String(item["성별"] || "").trim();
    if (["남자", "남성", "남"].includes(genderValue)) card.classList.add("gender-male");
    if (["여자", "여성", "여"].includes(genderValue)) card.classList.add("gender-female");
    const title = card.querySelector(".card-title strong");
    if (title) title.textContent = `${item["신청 구분"] || "소개팅 신청"} · ${item["이름"] || "이름 없음"}`;

    const meta = card.querySelector(".card-title .meta");
    if (meta) {
      const schedule = document.createElement("div");
      schedule.className = "application-schedule";
      schedule.textContent = `▣ 참여 일정: ${item["일정"] || "미선택"}`;
      meta.insertAdjacentElement("afterend", schedule);
      const badge = card.querySelector(".badge");
      if (badge) {
        const statusStack = document.createElement("div");
        statusStack.className = "application-status-stack";
        badge.insertAdjacentElement("beforebegin", statusStack);
        statusStack.append(badge, meta);
      }
    }

    const details = card.querySelector(".details");
    if (details) {
      const bodySection = [...details.querySelectorAll(".detail-section")].find((section) => section.querySelector("h3")?.textContent.includes("신체"));
      const bodyGrid = bodySection?.querySelector(".details-grid");
      if (bodyGrid) bodyGrid.insertAdjacentHTML("afterbegin", field("성별", item["성별"]));

      const section = document.createElement("section");
      section.className = "detail-section";
      section.innerHTML = `<h3>신청 일정</h3><div class="details-grid">${field("선택 날짜 · 시간", item["일정"])}${field("장소", item["장소"])}${field("참가 금액", item["금액"])}</div>`;
      details.insertBefore(section, details.firstChild);
    }

    const header = card.querySelector(".card-head");
    if (header) {
      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");
      header.setAttribute("aria-expanded", String(card.classList.contains("open")));
      header.setAttribute("aria-label", `${item["이름"] || "신청자"} 상세 정보 보기`);
    }

  });
};

function toggleApplicationCard(header) {
  const card = header.closest(".card");
  if (!card) return;
  card.classList.toggle("open");
  const isOpen = card.classList.contains("open");
  header.setAttribute("aria-expanded", String(isOpen));
  header.setAttribute("aria-label", `${header.querySelector(".card-title strong")?.textContent || "신청자"} 상세 정보 ${isOpen ? "닫기" : "보기"}`);
}

document.addEventListener("click", (event) => {
  const header = event.target.closest("#applicationsPanel .card-head");
  if (header) toggleApplicationCard(header);
});

document.addEventListener("keydown", (event) => {
  const header = event.target.closest?.("#applicationsPanel .card-head");
  if (header && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    toggleApplicationCard(header);
  }
});

renderApplications();
