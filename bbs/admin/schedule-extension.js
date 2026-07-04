const renderApplicationsWithoutSchedule = renderApplications;

renderApplications = function renderApplicationsWithSchedule() {
  renderApplicationsWithoutSchedule();
  const query = state.query.toLowerCase();
  const items = state.applications.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  const cards = document.querySelectorAll("#applicationsPanel .card");

  cards.forEach((card, index) => {
    const item = items[index];
    if (!item) return;
    card.querySelector(".detail-button")?.remove();
    const rawGender = String(item["성별"] || item["신청 구분"] || "");
    const isMale = /남/.test(rawGender);
    const genderShort = isMale ? "남" : "여";
    const fixedPrice = isMale ? "50,000원" : "30,000원";
    const avatar = card.querySelector(".avatar");
    if (avatar) {
      avatar.textContent = genderShort;
      avatar.classList.add(isMale ? "is-male" : "is-female");
    }
    const title = card.querySelector(".card-title strong");
    if (title) title.textContent = `${genderShort} · ${item["이름"] || "이름 없음"} · 신청`;

    const meta = card.querySelector(".card-title .meta");
    if (meta) {
      const schedule = document.createElement("div");
      schedule.className = "application-schedule";
      schedule.textContent = `▣ 참여 일정: ${item["일정"] || "미선택"}`;
      meta.insertAdjacentElement("afterend", schedule);
    }

    const details = card.querySelector(".details");
    if (details) {
      const section = document.createElement("section");
      section.className = "detail-section";
      section.innerHTML = `<h3>신청 일정</h3><div class="details-grid">${field("성별", genderShort)}${field("선택 날짜 · 시간", item["일정"])}${field("장소", item["장소"])}${field("참가 금액", fixedPrice)}</div>`;
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
