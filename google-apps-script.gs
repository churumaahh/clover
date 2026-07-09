const SHEET_NAME = '로테-루나';
const UPLOAD_FOLDER_NAME = '로테-루나 첨부파일';
const UPLOAD_FOLDER_ID_KEY = 'UPLOAD_FOLDER_ID';
const SPREADSHEET_ID = '1NtGGU6zpBiUCNNvzCNGlylOJzAwkdx4neMozi8y0Dcg';
const BOARD_SHEET_NAME = '자유 게시판';
const BOARD_ADMIN_PASSWORD_KEY = 'BOARD_ADMIN_PASSWORD';
const HERO_SHEET_NAME = '히어로 관리';
const HERO_INITIALIZED_KEY = 'HERO_INITIALIZED';
const EVENT_SHEET_NAME = '선택창 관리';
const EVENT_INITIALIZED_KEY = 'EVENT_INITIALIZED';

const HEADERS = [
  '접수일시', '신청 구분', '성별', '이벤트명', '일정', '장소', '금액',
  '이름', '연락처', '생년월일', '키(cm)', '체중(kg)', '거주지',
  '회사명 / 부서 or 직무', '이상형', '비선호',
  '흡연 유무', '음주 빈도', '종교', '전달 사항', '재직 증명 파일',
  '본인 사진 1', '본인 사진 2', '본인 사진 3', '본인 사진 4', '본인 사진 5',
  '환불 및 취소 규정 동의', '마케팅 활용 및 촬영 동의'
];

const BOARD_HEADERS = [
  '게시글 ID', '접수일시', '작성자', '비밀번호 해시', '비밀번호 솔트',
  '내용', '관리자 답변', '답변일시', '작성자 확인일시', '작성자 답글', '답글일시'
];

const HERO_HEADERS = [
  '배너 ID', '노출 순서', '제목', '설명', '이미지 URL', '원본 이미지 URL', '동영상 URL', '활성 상태', '수정일시'
];
const HERO_VIDEO_HEADER = '동영상 URL';
if (HERO_HEADERS.indexOf(HERO_VIDEO_HEADER) === -1) HERO_HEADERS.splice(6, 0, HERO_VIDEO_HEADER);

const EVENT_HEADERS = [
  '선택창 ID', '노출 순서', '연령대', '제목', '일정', '장소', '이미지 URL', '원본 이미지 URL',
  '남성 인원', '여성 인원', '모집 인원', '대상', '남성 금액', '할인 전 금액',
  '활성 상태', '수정일시'
];

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'boardList') {
    return jsonResponse_({ ok: true, posts: listBoardPosts_() });
  }
  if (e && e.parameter && e.parameter.action === 'heroList') {
    return jsonResponse_({ ok: true, slides: listHeroSlides_(false) });
  }
  if (e && e.parameter && e.parameter.action === 'eventList') {
    return jsonResponse_({ ok: true, events: listEvents_(false) });
  }
  return jsonResponse_({ ok: true, service: '濡쒗뀒-猷⑤굹 ?좎껌 ?묒닔' });
}

function authorizeServices() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
  const boardSheet = getBoardSheet_();
  ensureBoardHeaders_(boardSheet);
  const heroSheet = getHeroSheet_();
  ensureHeroHeaders_(heroSheet);
  const eventSheet = getEventSheet_();
  ensureEventHeaders_(eventSheet);
  const folder = getUploadFolder_();
  const adminPassword = ensureBoardAdminPassword_();
  return {
    sheet: sheet.getName(),
    boardSheet: boardSheet.getName(),
    heroSheet: heroSheet.getName(),
    eventSheet: eventSheet.getName(),
    uploadFolder: folder.getName(),
    boardAdminPassword: adminPassword,
    authorized: true
  };
}

function doPost(e) {
  if (!e || !e.parameter || !e.parameter.payload) {
    return jsonResponse_({ ok: false, error: 'payload媛 ?놁뒿?덈떎.' });
  }
  let initialData;
  try {
    initialData = JSON.parse(e.parameter.payload);
  } catch (error) {
    return jsonResponse_({ ok: false, error: '?붿껌 ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.' });
  }
  if (initialData.type === 'adminDashboard') {
    try {
      return jsonResponse_(getAdminDashboard_(initialData));
    } catch (error) {
      return jsonResponse_({ ok: false, error: String(error.message || error) });
    }
  }
  if (initialData.type === 'boardCreate') {
    try {
      return jsonResponse_(createBoardPost_(initialData));
    } catch (error) {
      return jsonResponse_({ ok: false, error: String(error.message || error) });
    }
  }
  if (initialData.type === 'boardRead') {
    try {
      return jsonResponse_(readBoardPost_(initialData));
    } catch (error) {
      return jsonResponse_({ ok: false, error: String(error.message || error) });
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.parameter || !e.parameter.payload) throw new Error('payload가 없습니다.');

    const data = JSON.parse(e.parameter.payload);
    if (data.type === 'boardUpdate') return jsonResponse_(updateBoardPost_(data));
    if (data.type === 'boardFollowUp') return jsonResponse_(followUpBoardPost_(data));
    if (data.type === 'boardReply') return jsonResponse_(replyBoardPost_(data));
    if (data.type === 'heroSave') return jsonResponse_(saveHeroSlide_(data));
    if (data.type === 'heroDelete') return jsonResponse_(deleteHeroSlide_(data));
    if (data.type === 'eventSave') return jsonResponse_(saveEvent_(data));
    if (data.type === 'eventDelete') return jsonResponse_(deleteEvent_(data));

    const folder = getUploadFolder_();
    const applicantName = safeFileName_(data.name || '이름없음');
    const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmmss');
    const documentUrl = saveFile_(folder, data.documentFile, stamp + '-' + applicantName + '-재직증명');
    const photoUrls = (Array.isArray(data.photoFiles) ? data.photoFiles : [])
      .map(function(file, index) {
        return saveFile_(folder, file, stamp + '-' + applicantName + '-본인사진-' + (index + 1));
      })
      .filter(Boolean);

    if (photoUrls.length < 3 || photoUrls.length > 5) throw new Error('본인 사진은 3-5장이 필요합니다.');

    const photoCells = photoUrls.slice(0, 5);
    while (photoCells.length < 5) photoCells.push('');

    const sheet = getSheet_();
    ensureHeaders_(sheet);
    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const row = [
      submittedAt, text_(data.applicationType), text_(data.gender), text_(data.eventTitle),
      text_(data.eventDate), text_(data.eventPlace), text_(data.eventPrice), text_(data.name),
      text_(data.phone), text_(data.birth), text_(data.height), text_(data.weight),
      text_(data.area), text_(data.job), text_(data.ideal), text_(data.dislike),
      text_(data.smoking), text_(data.drinking), text_(data.religion), text_(data.message),
      documentUrl,
      photoCells[0], photoCells[1], photoCells[2], photoCells[3], photoCells[4],
      data.refundAgree === true ? '동의' : '미동의',
      data.marketingAgree === true ? '동의' : '미동의'
    ];

    sheet.appendRow(row);
    const lastRow = sheet.getLastRow();

    return jsonResponse_({ ok: true, row: lastRow, documentUrl: documentUrl, photoUrls: photoUrls });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function getAdminDashboard_(data) {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
  const applications = sheet.getLastRow() < 2 ? [] : sheet
    .getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length)
    .getValues()
    .map(function(row, index) {
      const item = { id: index + 2 };
      HEADERS.forEach(function(header, column) {
        const value = row[column];
        item[header] = value instanceof Date
          ? (header === '?묒닔?쇱떆'
            ? value.getTime()
            : Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd'))
          : String(value || '');
      });
      return item;
    })
    .sort(function(a, b) { return Number(b['접수일시']) - Number(a['접수일시']); });

  const boardSheet = getBoardSheet_();
  ensureBoardHeaders_(boardSheet);
  const boardPosts = boardSheet.getLastRow() < 2 ? [] : boardSheet
    .getRange(2, 1, boardSheet.getLastRow() - 1, BOARD_HEADERS.length)
    .getValues()
    .map(function(row) {
      return {
        id: String(row[0]),
        createdAt: row[1] instanceof Date ? row[1].getTime() : new Date(row[1]).getTime(),
        author: String(row[2] || ''),
        content: String(row[5] || ''),
        reply: String(row[6] || ''),
        followUp: String(row[9] || ''),
        status: row[6] ? (row[8] ? '확인' : '완료') : '접수'
      };
    })
    .filter(function(post) { return post.id; })
    .sort(function(a, b) { return b.createdAt - a.createdAt; });

  return {
    ok: true,
    applications: applications,
    boardPosts: boardPosts,
    heroSlides: listHeroSlides_(true),
    events: listEvents_(true)
  };
}

function ensureColumnAfter_(sheet, headerName, afterHeaderName) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) { return String(value || ''); });
  if (headers.indexOf(headerName) !== -1) return;
  const afterIndex = headers.indexOf(afterHeaderName);
  const insertAfter = afterIndex >= 0 ? afterIndex + 1 : lastColumn;
  sheet.insertColumnAfter(insertAfter);
  sheet.getRange(1, insertAfter + 1).setValue(headerName);
}
function listEvents_(includeInactive) {
  const sheet = getEventSheet_();
  ensureEventHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, EVENT_HEADERS.length)
    .getValues()
    .map(function(row) {
      const station = String(row[2] || '');
      return {
        id: String(row[0] || ''), order: Number(row[1]) || 0,
        station: station, title: normalizeEventTitle_(station, row[3]),
        date: String(row[4] || ''), place: normalizeEventPlace_(row[5]), image: normalizeEventImage_(station, row[6]),
        sourceImage: String(row[7] || row[6] || ''), sourceImageUrl: String(row[7] || row[6] || ''),
        male: String(row[8] || '6'), female: String(row[9] || '6'), capacity: String(row[10] || '총 12명 (남 6명 · 여 6명)'),
        target: String(row[11] || '남성'), price: String(row[12] || ''), oldPrice: String(row[13] || ''),
        active: String(row[14]) !== '비활성',
        updatedAt: row[15] instanceof Date ? row[15].getTime() : new Date(row[15]).getTime(),
        showGenderCount: true, confirmed: '0/6명', showCardStatus: false, dday: ''
      };
    })
    .filter(function(item) { return item.id && item.image && (includeInactive || item.active); })
    .sort(function(a, b) { return a.order - b.order || a.updatedAt - b.updatedAt; });
}
function saveEvent_(data) {
  verifyAdminPassword_(data.adminPassword);
  const sheet = getEventSheet_();
  ensureEventHeaders_(sheet);
  const id = String(data.id || Utilities.getUuid());
  const found = findEvent_(id, false);
  let imageUrl = found ? String(found.row[6] || '') : '';
  let sourceImageUrl = found ? String(found.row[7] || found.row[6] || '') : '';
  if (data.imageUrl) imageUrl = String(data.imageUrl).trim();
  if (data.sourceImageUrl) sourceImageUrl = String(data.sourceImageUrl).trim();
  if (!sourceImageUrl && imageUrl) sourceImageUrl = imageUrl;
  if (!imageUrl) throw new Error('선택창 이미지를 선택해 주세요.');
  const row = [
    id, Math.max(1, Number(data.order) || 1), String(data.station || '').trim(),
    String(data.title || '').trim(), String(data.date || '').trim(), String(data.place || '').trim(),
    imageUrl, sourceImageUrl, String(data.male || '').trim(), String(data.female || '').trim(),
    String(data.capacity || '').trim(), String(data.target || '').trim(), String(data.price || '').trim(),
    String(data.oldPrice || '').trim(), data.active === false ? '비활성' : '활성', new Date()
  ];
  if (!row[2] || !row[3] || !row[4] || !row[5]) throw new Error('연령대, 제목, 일정, 장소를 입력해 주세요.');
  if (found) sheet.getRange(found.rowNumber, 1, 1, EVENT_HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
  sheet.getRange(found ? found.rowNumber : sheet.getLastRow(), 16).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  return { ok: true, event: listEvents_(true).filter(function(item) { return item.id === id; })[0] };
}

function deleteEvent_(data) {
  verifyAdminPassword_(data.adminPassword);
  const found = findEvent_(data.id, true);
  found.sheet.deleteRow(found.rowNumber);
  return { ok: true, id: String(data.id) };
}

function findEvent_(id, required) {
  const sheet = getEventSheet_();
  ensureEventHeaders_(sheet);
  if (sheet.getLastRow() >= 2) {
    const finder = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(String(id || '')).matchEntireCell(true).findNext();
    if (finder) {
      const rowNumber = finder.getRow();
      return { sheet: sheet, rowNumber: rowNumber, row: sheet.getRange(rowNumber, 1, 1, EVENT_HEADERS.length).getValues()[0] };
    }
  }
  if (required) throw new Error('?좏깮李쎌쓣 李얠쓣 ???놁뒿?덈떎.');
  return null;
}

function getEventSheet_() {
  const spreadsheet = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('SPREADSHEET_ID를 입력해 주세요.');
  return spreadsheet.getSheetByName(EVENT_SHEET_NAME) || spreadsheet.insertSheet(EVENT_SHEET_NAME);
}

function ensureEventHeaders_(sheet) {
  if (!(sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() === EVENT_HEADERS[0])) {
    if (sheet.getLastRow() > 0) sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, EVENT_HEADERS.length).setFontWeight('bold');
  }
  ensureColumnAfter_(sheet, '원본 이미지 URL', '이미지 URL');
  sheet.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty(EVENT_INITIALIZED_KEY)) {
    if (sheet.getLastRow() < 2) {
      const now = new Date();
      sheet.getRange(2, 1, 5, EVENT_HEADERS.length).setValues([
        [Utilities.getUuid(),1,'21 - 27세','설레이는 만남','06. 29. (월) 오후 07:30','서면 클로버 라운지 (승인 후 안내)','','','6','6','총 12명 (남 6명 · 여 6명)','남성','50,000원','50,000원','활성',now],
        [Utilities.getUuid(),2,'24 - 29세','티키타카 로테이션 소개팅','07. 04. (토) 오후 04:00','서면 클로버 라운지 (승인 후 안내)','','','6','6','총 12명 (남 6명 · 여 6명)','남성','30,000원','','활성',now],
        [Utilities.getUuid(),3,'27 - 36세','퇴근 후 약속','07. 05. (일) 오후 03:00','서면 클로버 라운지 (승인 후 안내)','','','6','6','총 12명 (남 6명 · 여 6명)','남성','30,000원','','활성',now],
        [Utilities.getUuid(),4,'30 - 37세','매일 똑같은 일상, 새로운 만남','06. 29. (월) 오후 07:30','서면 클로버 라운지 (승인 후 안내)','','','6','6','총 12명 (남 6명 · 여 6명)','남성','50,000원','50,000원','활성',now],
        [Utilities.getUuid(),5,'34 - 39세','편안한 대화','07. 04. (토) 오후 04:00','서면 클로버 라운지 (승인 후 안내)','','','6','6','총 12명 (남 6명 · 여 6명)','남성','30,000원','','활성',now]
      ]);
      sheet.getRange(2, 16, 5, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    properties.setProperty(EVENT_INITIALIZED_KEY, 'true');
  }
}
function saveEventImage_(fileData, id) {
  return saveHeroImage_(fileData, 'event-' + id);
}

function normalizeEventPlace_(value) {
  const text = String(value || '');
  if (!text || /광안리|해운대|클로버 서면|스카이 라운지|클로버 운지/.test(text)) {
    return '서면 클로버 라운지 (승인 후 안내)';
  }
  return text;
}
function normalizeEventTitle_(station, title) {
  const titles = {
    '21 - 27세': '설레이는 만남',
    '24 - 29세': '티키타카 로테이션 소개팅',
    '27 - 36세': '퇴근 후 약속',
    '30 - 37세': '매일 똑같은 일상, 새로운 만남',
    '34 - 39세': '편안한 대화'
  };
  return titles[String(station || '')] || String(title || '');
}
function cloudinaryImageUrl_(value) {
  const url = String(value || "").trim();
  return /^https:\/\/res\.cloudinary\.com\//i.test(url) ? url : "";
}
function normalizeEventImage_(station, image) {
  return cloudinaryImageUrl_(image);
}

function listHeroSlides_(includeInactive) {
  const sheet = getHeroSheet_();
  ensureHeroHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HERO_HEADERS.length)
    .getValues()
    .map(function(row) {
      return {
        id: String(row[0] || ''),
        order: Number(row[1]) || 0,
        title: normalizeHeroTitle_(row[2]),
        description: String(row[3] || ''),
        imageUrl: normalizeHeroImage_(row[4]),
        sourceImageUrl: String(row[5] || row[4] || ''),
        videoUrl: String(row[6] || ''),
        active: String(row[7]) !== '비활성',
        updatedAt: row[8] instanceof Date ? row[8].getTime() : new Date(row[8]).getTime()
      };
    })
    .filter(function(slide) {
      return slide.id && slide.imageUrl && (includeInactive || slide.active);
    })
    .sort(function(a, b) {
      return a.order - b.order || a.updatedAt - b.updatedAt;
    });
}

function normalizeHeroTitle_(value) {
  return String(value || '').replace(/가입,?\s*로그인\s*X/i, '가입 X, 로그인 X').replace('가입 로그인 X', '가입 X, 로그인 X');
}
function normalizeHeroImage_(value) {
  return cloudinaryImageUrl_(value);
}
function mediaTypeFromUrl_(value) {
  const url = String(value || '').toLowerCase();
  if (/[?&]media=video(?:&|$)/.test(url) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/.test(url)) return 'video';
  return 'image';
}

function mediaTypeFromMime_(value) {
  return String(value || '').toLowerCase().indexOf('video/') === 0 ? 'video' : 'image';
}

function saveHeroSlide_(data) {
  verifyAdminPassword_(data.adminPassword);
  const sheet = getHeroSheet_();
  ensureHeroHeaders_(sheet);
  const id = String(data.id || Utilities.getUuid());
  const found = findHeroSlide_(id, false);
  let imageUrl = found ? String(found.row[4] || '') : '';
  let sourceImageUrl = found ? String(found.row[5] || found.row[4] || '') : '';
  let videoUrl = found ? String(found.row[6] || '') : '';
  if (data.imageUrl) imageUrl = String(data.imageUrl).trim();
  if (data.sourceImageUrl) sourceImageUrl = String(data.sourceImageUrl).trim();
  if (data.videoUrl) videoUrl = String(data.videoUrl).trim();
  if (data.removeVideo === true) videoUrl = '';
  if (!sourceImageUrl && imageUrl) sourceImageUrl = imageUrl;
  if (!imageUrl) throw new Error('배너 이미지를 선택해 주세요.');

  const row = [
    id,
    Math.max(1, Number(data.order) || 1),
    String(data.title || '').trim(),
    String(data.description || '').trim(),
    imageUrl,
    sourceImageUrl,
    videoUrl,
    data.active === false ? '비활성' : '활성',
    new Date()
  ];
  if (found) {
    sheet.getRange(found.rowNumber, 1, 1, HERO_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  sheet.getRange(found ? found.rowNumber : sheet.getLastRow(), 9).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  return { ok: true, slide: listHeroSlides_(true).filter(function(item) { return item.id === id; })[0] };
}

function deleteHeroSlide_(data) {
  verifyAdminPassword_(data.adminPassword);
  const found = findHeroSlide_(data.id, true);
  found.sheet.deleteRow(found.rowNumber);
  return { ok: true, id: String(data.id) };
}

function findHeroSlide_(id, required) {
  const sheet = getHeroSheet_();
  ensureHeroHeaders_(sheet);
  if (sheet.getLastRow() >= 2) {
    const finder = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(String(id || ''))
      .matchEntireCell(true)
      .findNext();
    if (finder) {
      const rowNumber = finder.getRow();
      return {
        sheet: sheet,
        rowNumber: rowNumber,
        row: sheet.getRange(rowNumber, 1, 1, HERO_HEADERS.length).getValues()[0]
      };
    }
  }
  if (required) throw new Error('諛곕꼫瑜?李얠쓣 ???놁뒿?덈떎.');
  return null;
}

function getHeroSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('SPREADSHEET_ID를 입력하거나 시트에 연결된 Apps Script에서 실행해 주세요.');
  return spreadsheet.getSheetByName(HERO_SHEET_NAME) || spreadsheet.insertSheet(HERO_SHEET_NAME);
}

function ensureHeroHeaders_(sheet) {
  if (!(sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() === HERO_HEADERS[0])) {
    if (sheet.getLastRow() > 0) sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HERO_HEADERS.length).setValues([HERO_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HERO_HEADERS.length).setFontWeight('bold');
  }
  ensureColumnAfter_(sheet, '원본 이미지 URL', '이미지 URL');
  ensureColumnAfter_(sheet, HERO_VIDEO_HEADER, HERO_HEADERS[5]);
  sheet.getRange(1, 1, 1, HERO_HEADERS.length).setValues([HERO_HEADERS]);

  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty(HERO_INITIALIZED_KEY)) {
    if (sheet.getLastRow() < 2) {
      const now = new Date();
      sheet.getRange(2, 1, 3, HERO_HEADERS.length).setValues([
        [Utilities.getUuid(), 1, '가입 X, 로그인 X', 'cLOVEr가 진행하는 소셜링 이벤트로 관심사가 통하는 사람을 만나보세요', '', '', '', '활성', now],
        [Utilities.getUuid(), 2, '대화가 편해지는 만남', '처음 만나는 자리도 자연스럽게 이어지도록 운영자가 흐름을 안내합니다', '', '', '', '활성', now],
        [Utilities.getUuid(), 3, '퇴근 후 가볍게', '취향, 생활권, 대화 온도를 고려해 회차로 부담 없이 참여해보세요', '', '', '', '활성', now]
      ]);
      sheet.getRange(2, 9, 3, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    properties.setProperty(HERO_INITIALIZED_KEY, 'true');
  }
}
function saveHeroImage_(fileData, id) {
  throw new Error("이미지와 동영상은 Cloudinary URL로만 저장해 주세요.");
}

function verifyAdminPassword_(password) {
  if (String(password || '') !== ensureBoardAdminPassword_()) {
    throw new Error('관리자 비밀번호가 일치하지 않습니다.');
  }
}

function createBoardPost_(data) {
  const password = String(data.password || '');
  const content = String(data.content || '').trim();
  if (password.length < 4) throw new Error('비밀번호는 4자리 이상 입력해 주세요.');
  if (!content) throw new Error('내용을 입력해 주세요.');

  const sheet = getBoardSheet_();
  ensureBoardHeaders_(sheet);
  const id = Utilities.getUuid();
  const createdAt = new Date();
  const author = /^[가-힣]{2}$/.test(String(data.author || '')) ? String(data.author) : createAnonymousName_();
  const salt = Utilities.getUuid();
  const passwordHash = hashPassword_(password, salt);
  sheet.appendRow([id, createdAt, author, passwordHash, salt, content, '', '', '', '', '']);
  return {
    ok: true,
    post: {
      id: id,
      author: author,
      createdAt: createdAt.getTime(),
      status: '접수'
    }
  };
}
function listBoardPosts_() {
  const sheet = getBoardSheet_();
  ensureBoardHeaders_(sheet);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, BOARD_HEADERS.length)
    .getValues()
    .map(function(row) {
      return {
        id: String(row[0]),
        author: String(row[2]),
        createdAt: row[1] instanceof Date ? row[1].getTime() : new Date(row[1]).getTime(),
        status: row[6] ? (row[8] ? '확인' : '완료') : '접수'
      };
    })
    .filter(function(post) { return post.id && post.author; })
    .sort(function(a, b) { return b.createdAt - a.createdAt; });
}

function readBoardPost_(data) {
  const password = String(data.password || '');
  const found = findBoardPost_(data.id);
  const adminPassword = ensureBoardAdminPassword_();
  const isAdmin = password === adminPassword;
  const isAuthor = hashPassword_(password, String(found.row[4])) === String(found.row[3]);
  if (!isAdmin && !isAuthor) throw new Error('비밀번호가 일치하지 않습니다.');
  if (isAuthor && found.row[6] && !found.row[8]) {
    found.sheet.getRange(found.rowNumber, 9).setValue(new Date()).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    found.row[8] = new Date();
  }
  return {
    ok: true,
    admin: isAdmin,
    editable: isAuthor,
    author: String(found.row[2]),
    content: String(found.row[5] || ''),
    reply: String(found.row[6] || ''),
    followUp: String(found.row[9] || ''),
    status: found.row[6] ? (found.row[8] ? '확인' : '완료') : '접수'
  };
}

function updateBoardPost_(data) {
  const password = String(data.password || '');
  const content = String(data.content || '').trim();
  if (!content) throw new Error('수정할 내용을 입력해 주세요.');
  const found = findBoardPost_(data.id);
  const isAuthor = hashPassword_(password, String(found.row[4])) === String(found.row[3]);
  if (!isAuthor) throw new Error('비밀번호가 일치하지 않습니다.');
  found.sheet.getRange(found.rowNumber, 6).setValue(content);
  return { ok: true, content: content };
}

function followUpBoardPost_(data) {
  const password = String(data.password || '');
  const followUp = String(data.followUp || '').trim();
  if (!followUp) throw new Error('답글 내용을 입력해 주세요.');
  const found = findBoardPost_(data.id);
  const isAuthor = hashPassword_(password, String(found.row[4])) === String(found.row[3]);
  if (!isAuthor) throw new Error('비밀번호가 일치하지 않습니다.');
  if (!found.row[6]) throw new Error('관리자 답변 등록 후 답글을 작성할 수 있습니다.');
  found.sheet.getRange(found.rowNumber, 10, 1, 2).setValues([[followUp, new Date()]]);
  found.sheet.getRange(found.rowNumber, 11).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  return { ok: true, followUp: followUp };
}

function replyBoardPost_(data) {
  const adminPassword = ensureBoardAdminPassword_();
  if (String(data.adminPassword || '') !== adminPassword) {
    throw new Error('관리자 비밀번호가 일치하지 않습니다.');
  }
  const reply = String(data.reply || '').trim();
  if (!reply) throw new Error('답변 내용을 입력해 주세요.');
  const found = findBoardPost_(data.id);
  found.sheet.getRange(found.rowNumber, 7, 1, 3).setValues([[reply, new Date(), '']]);
  found.sheet.getRange(found.rowNumber, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  found.sheet.getRange(found.rowNumber, 9).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  return { ok: true, reply: reply, status: '완료' };
}
function findBoardPost_(id) {
  const sheet = getBoardSheet_();
  ensureBoardHeaders_(sheet);
  if (sheet.getLastRow() < 2) throw new Error('게시글을 찾을 수 없습니다.');
  const finder = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id || ''))
    .matchEntireCell(true)
    .findNext();
  if (!finder) throw new Error('게시글을 찾을 수 없습니다.');
  const rowNumber = finder.getRow();
  return {
    sheet: sheet,
    rowNumber: rowNumber,
    row: sheet.getRange(rowNumber, 1, 1, BOARD_HEADERS.length).getValues()[0]
  };
}

function getBoardSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('SPREADSHEET_ID를 입력하거나 시트에 연결된 Apps Script에서 실행해 주세요.');
  return spreadsheet.getSheetByName(BOARD_SHEET_NAME) || spreadsheet.insertSheet(BOARD_SHEET_NAME);
}

function ensureBoardHeaders_(sheet) {
  if (sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() !== BOARD_HEADERS[0]) {
    sheet.insertRowBefore(1);
  }
  sheet.getRange(1, 1, 1, BOARD_HEADERS.length).setValues([BOARD_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, BOARD_HEADERS.length).setFontWeight('bold');
  sheet.hideColumns(4, 2);
}

function ensureBoardAdminPassword_() {
  const password = '1111';
  PropertiesService.getScriptProperties().setProperty(BOARD_ADMIN_PASSWORD_KEY, password);
  return password;
}

function getBoardAdminPassword() {
  return ensureBoardAdminPassword_();
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + String(password),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(bytes);
}

function createAnonymousName_() {
  const first = ['봄', '달', '별', '꽃', '빛', '솔', '숲', '눈', '해', '강', '산', '길'];
  const second = ['별', '봄', '달', '꽃', '빛', '결', '솔', '길', '눈', '숲', '밤', '잎'];
  return first[Math.floor(Math.random() * first.length)] + second[Math.floor(Math.random() * second.length)];
}
function getSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('SPREADSHEET_ID를 입력하거나 시트에 연결된 Apps Script에서 실행해 주세요.');
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() === HEADERS[0]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    return;
  }
  if (sheet.getLastRow() > 0 && sheet.getRange(1, 1).getValue() !== HEADERS[0]) {
    sheet.insertRowBefore(1);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
}

function getUploadFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const cachedId = properties.getProperty(UPLOAD_FOLDER_ID_KEY);
  if (cachedId) {
    try {
      return DriveApp.getFolderById(cachedId);
    } catch (error) {
      properties.deleteProperty(UPLOAD_FOLDER_ID_KEY);
    }
  }
  const folders = DriveApp.getFoldersByName(UPLOAD_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(UPLOAD_FOLDER_NAME);
  properties.setProperty(UPLOAD_FOLDER_ID_KEY, folder.getId());
  return folder;
}

function saveFile_(folder, fileData, prefix) {
  if (!fileData || !fileData.base64) return '';
  const bytes = Utilities.base64Decode(fileData.base64);
  const originalName = safeFileName_(fileData.name || 'file');
  const extensionMatch = originalName.match(/(\.[a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : '';
  const blob = Utilities.newBlob(bytes, fileData.mimeType || 'application/octet-stream', prefix + extension);
  return folder.createFile(blob).getUrl();
}

function safeFileName_(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
}

function text_(value) {
  const text = value == null ? '' : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}


