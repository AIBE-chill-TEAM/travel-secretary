// supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://frqevnyaghrnmtccnerc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycWV2bnlhZ2hybm10Y2NuZXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyNTk4MDIsImV4cCI6MjA1NDgzNTgwMn0.1ITu6ie5GxJE_mf_a-G5kblLoY_5kYStt6EBxf8drPQ";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tableName = "travel_planner";

// 삽입
async function addDBData(userId, name, content, location, dailyPlaces) {
  const { data, error } = await supabase.from(tableName).insert([
    {
      user_id: userId,
      list_name: name,
      list_content: content,
      list_location: location,
      list_daily_places: dailyPlaces,
    },
  ]);

  if (error) {
    console.error("❌ 데이터 삽입 실패:", error);
  } else {
    console.log("✅ 데이터 삽입 성공:", data);
  }
}

// userId로 조회
async function getDBDataByUserId(user_id) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("❌ 데이터 조회 실패:", error);
  } else {
    console.log("✅ 데이터 조회 성공:", data);
  }
}

// 로그인된 id 조회
async function getId() {
  const { data, error } = await supabase.auth.getUser(); // 로그인된 유저 정보 가져오기

  if (error) {
    console.error("❌ 유저 정보 가져오기 실패:", error);
    return null; // 로그인되지 않은 경우 null 반환
  }

  if (!data || !data.user) {
    console.log("❌ 로그인된 유저가 없습니다.");
    return null; // 로그인된 유저가 없을 경우 null 반환
  }

  const { data: userInfo, error: userError } = await supabase
    .from("userinfo")
    .select("*")
    .eq("id", data.user.id); // 로그인된 유저의 ID로 userinfo 테이블에서 조회

  if (userError) {
    console.error("❌ userinfo 테이블에서 유저 조회 실패:", userError);
    return null;
  }

  if (userInfo && userInfo.length > 0) {
    return userInfo[0].id; // 유저의 ID 반환
  } else {
    console.log("❌ 해당 ID의 유저 정보가 없습니다.");
    return null;
  }
}

// 삭제
async function deleteDBData(id) {
  const { data, error } = await supabase.from(tableName).delete().eq("id", id); // 특정 여행 계획 삭제

  if (error) {
    console.error("❌ 데이터 삭제 실패:", error);
  } else {
    console.log("✅ 데이터 삭제 성공:", data);
  }
}

// 구글맵 API 키
const googlemapAPiKey = "AIzaSyDv3p4H66gnGpN3DtDd7lpMWSkeOGiObUY";

// 구글맵 장소 탐색
// 비동기 textSearch, 좌표 지정하고 거리로 검색범위, 입력값 정확도(LLM으로 영문으로 된 지역명을 추가시킨 장소명 생성)
let map;

async function initMap(
  places = ["Googleplex"],
  latLngTxt = '{ "lat": 0, "lng": 0 }'
) {
  const { Map } = await google.maps.importLibrary("maps");
  const { PlacesService } = await google.maps.importLibrary("places");

  let latLng;
  try {
    latLng = JSON.parse(latLngTxt);
    if (typeof latLng !== "object" || latLng === null) {
      latLng = { lat: 0, lng: 0 };
    }
  } catch {
    latLng = { lat: 0, lng: 0 };
  }
  map = new Map(document.getElementById("map"), {
    center: latLng,
    zoom: 12,
  });

  const service = new PlacesService(map);

  if (!places || !Array.isArray(places) || places.length === 0) {
    console.error("장소 데이터가 없거나 올바르지 않습니다.");
    return;
  }

  let bounds = new google.maps.LatLngBounds();

  // 각 장소에 대해 검색을 순차적으로 실행
  for (const place of places) {
    try {
      const request = {
        query: place,
        location: latLng,
        radius: 50000, // 50km
      };

      await new Promise((resolve) => {
        service.textSearch(request, (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length > 0
          ) {
            // 첫 번째 결과만 사용
            const result = results[0];
            const location = result.geometry.location;

            // 마커 생성
            new google.maps.Marker({
              map,
              position: location,
              title: result.name,
            });

            bounds.extend(location);

            // 검색 결과 로깅
            console.log(
              `Found place: ${result.name} for search term: ${place}`
            );
          } else {
            console.warn(`검색 실패 - 장소: ${place}, 상태: ${status}`);
          }
          resolve();
        });
      });
    } catch (error) {
      console.error(`Error searching for ${place}:`, error);
    }
  }

  // 검색된 장소들이 모두 보이도록 지도 조정
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
  }
}

// Google Maps API 로드
const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${googlemapAPiKey}&callback=initMap&libraries=places`;

const script = document.createElement("script");
script.src = scriptUrl;
script.async = true;
script.defer = true;
document.head.appendChild(script);

document.addEventListener("DOMContentLoaded", function () {
  // Form과 요소들을 제대로 선택
  const controllerForm = document.getElementById("controller");
  const inputField = controllerForm.querySelector("input[name='destination']"); // 원하는 input 필드를 정확히 선택
  const submitBtn = controllerForm.querySelector("button[type='submit']");
  const box = document.getElementById("box");
  const popup = document.getElementById("popup");
  const locationsPopup = document.getElementById("locationsPopup");
  const popupOverlay = document.getElementById("popupOverlay");
  const locationsPopupOverlay = document.getElementById(
    "locationsPopupOverlay"
  );
  const popupBtn = document.getElementById("closePopupBtn");
  const locationsPopupBtn = document.getElementById("locationsClosePopupBtn");
  const mapIframe = document.getElementById("mapIframe");
  const saveBtn = document.getElementById("saveBtn");
  const listModal = document.getElementById("listModal");
  const listItems = document.getElementById("listItems");
  const mapPopup = document.getElementById("map");

  function saveMarkdown() {
    const markdownDB = localStorage.getItem("markdown");
    if (markdownDB !== null) {
      const arrayDB = localStorage.getItem("array");
      const locationDB = localStorage.getItem("location");
      const submitDataDB = localStorage.getItem("submitData");
      const nameDB = `${submitDataDB[1]}일간의 ${submitDataDB[0]} ${submitDataDB[2]} 여행`;

      // 마크다운을 데이터베이스에 저장
      // 방문장소를 데이터베이스에 저장
      // 좌표를 데이터베이스에 저장
      // 제목을 데이터베이스에 저장 (${travelDays}일간의 ${destination} ${travelTheme} 여행)
      addDBData(getId(), nameDB, markdownDB, locationDB, arrayDB);
    } else {
      showToast("저장할 내용이 없습니다.", "danger");
    }
  }

  listModal.addEventListener("shown.bs.modal", () => {
    listItems.innerHTML = ""; // 기존 리스트 초기화

    // 리스트 아이템 데이터
    // ************* 22222
    // DB에서 제목과 id 불러오기
    // *************
    const items = JSON.parse(getDBDataByUserId(getId()));
    // const items = [
    //   // 예시
    //   { text: "제목 1", id: "id 1" },
    //   { text: "제목 2", id: "id 2" },
    //   { text: "제목 3", id: "id 3" },
    //   { text: "제목 4", id: "id 4" },
    // ];

    items.forEach((item) => {
      const li = document.createElement("li");
      li.style.display = "flex"; // flexbox 사용
      li.style.alignItems = "center"; // 수직 가운데 정렬
      li.style.padding = "10px";
      li.style.borderBottom = "1px solid #eee";

      const span = document.createElement("span");
      span.style.flexGrow = "1"; // span이 남은 공간을 모두 차지
      span.textContent = item.list_name; // 리스트 텍스트 표시

      const loadButton = document.createElement("button");
      loadButton.textContent = "불러오기";
      loadButton.classList.add("btn", "btn-sm", "btn-primary", "loadButton"); // 부트스트랩 버튼 스타일 추가 및 클래스
      loadButton.style.marginLeft = "10px"; // 버튼 왼쪽 여백

      // 불러오기 버튼 클릭 시
      loadButton.addEventListener("click", () => {
        // 방문장소, 좌표 로컬스토리지에 저장하기
        localStorage.setItem("", item.list_daily_places);
        localStorage.setItem("", item.location);
        // addMsg(불러온 마크다운)
        addMsg(item.list_content);
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "삭제";
      deleteButton.classList.add(
        "btn",
        "btn-sm",
        "btn-primary",
        "deleteButton"
      ); // 부트스트랩 버튼 스타일 추가 및 클래스
      deleteButton.style.marginLeft = "10px"; // 버튼 왼쪽 여백

      // 삭제 버튼 클릭 시
      deleteButton.addEventListener("click", () => {
        // DB 내 해당 데이터 삭제
        deleteDBData(item.id);
      });

      li.appendChild(span);
      li.appendChild(loadButton);
      li.appendChild(deleteButton);
      listItems.appendChild(li);
    });
  });

  saveBtn.addEventListener("click", saveMarkdown);

  // Toast 메시지 표시 함수
  function showToast(message, type) {
    const toastContainer = document.querySelector(".toast-container");

    // 새로운 toast 생성
    const toast = document.createElement("div");
    toast.classList.add(
      "toast",
      "align-items-center",
      "text-white",
      "border-0",
      "show"
    );

    // 메시지의 유형에 따라 클래스 추가
    if (type === "success") {
      toast.classList.add("bg-success");
    } else if (type === "danger") {
      toast.classList.add("bg-danger");
    } else if (type === "info") {
      toast.classList.add("bg-info");
    } else {
      toast.classList.add("bg-warning");
    }

    // Toast 내용 추가
    toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;

    // Toast를 Toast container에 추가
    toastContainer.appendChild(toast);

    // Bootstrap의 Toast 객체 생성 후, 3초 후에 자동으로 사라지게 설정
    const bootstrapToast = new bootstrap.Toast(toast, { delay: 3000 });
    bootstrapToast.show();
  }

  // 폼 제출 이벤트 처리
  controllerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    // inputField가 null인 경우 방지
    if (!inputField) {
      console.error("입력 필드를 찾을 수 없습니다.");
      return;
    }

    const inputData = inputField.value.trim();
    if (!inputData) {
      showToast("입력 필드를 채워주세요!", "danger");
      return;
    }

    // 버튼 비활성화
    submitBtn.disabled = true;

    setTimeout(() => {
      showToast("생성중이니 잠시만 기다려주십시오.", "success");
      submitBtn.disabled = false; // 버튼 다시 활성화
    }, 3000); // 3초 딜레이
  });

  function locationsOpenPopup(places) {
    console.log(places);
    window.initMap(places, JSON.parse(localStorage.getItem("location"))); // DOMContentLoaded 후에 places 데이터를 initMap에 전달
    locationsPopup.style.display = "block"; // 팝업 보이기
    locationsPopupOverlay.style.display = "block"; // 오버레이 보이기
    locationsPopupBtn.style.display = "block"; // 팝업 닫기 보이기
    showToast("로딩중입니다. 잠시 기다려주십요.", "success");
  }

  // 두 번째 기능 (마크다운 파싱 + 로컬 스토리지 활용)
  const addMsg = (msg) => {
    const p = document.createElement("p");
    p.innerHTML = `<pre>${marked.parse(msg)}</pre>`; // 마크다운 파싱
    box.appendChild(p);
    // 팝업
    const links = p.querySelectorAll("a");
    links.forEach((link) => {
      if (link.getAttribute("href").includes("https://")) {
        // https://이 포함되면 새 창으로 열기
        link.addEventListener("click", (e) => {
          e.preventDefault(); // 기본 링크 동작을 막고
          const mapUrl = link.getAttribute("href"); // 링크의 URL을 가져옴
          console.log(mapUrl);
          window.open(mapUrl);
        });
      } else if (link.getAttribute("href").includes("Day")) {
        // DAY가 포함되면
        link.addEventListener("click", (e) => {
          e.preventDefault(); // 기본 링크 동작을 막고
          // 해당 일정 장소들 팝업 지도에 찍기
          const mapUrl = link.getAttribute("href"); // 링크의 URL을 가져옴
          console.log(mapUrl);
          locationsArray = JSON.parse(localStorage.getItem("array"));
          console.log(locationsArray);
          locationsOpenPopup(locationsArray[mapUrl]);
        });
      } else {
        link.addEventListener("click", (e) => {
          e.preventDefault(); // 기본 링크 동작을 막고
          linkPlace = link.getAttribute("href");
          console.log(linkPlace);
          const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${googlemapAPiKey}&q=${linkPlace}`; // API로 찾은 URL
          openPopup(mapUrl); // 팝업 열기
        });
      }
    });
  };

  // 팝업 열기
  function openPopup(url) {
    mapIframe.src = url; // URL을 iframe의 src로 설정
    popup.style.display = "block"; // 팝업 보이기
    popupOverlay.style.display = "block"; // 오버레이 보이기
    popupBtn.style.display = "block"; // 팝업 닫기 보이기
  }

  // 팝업 닫기
  function closePopup() {
    popup.style.display = "none"; // 팝업 숨기기
    popupOverlay.style.display = "none"; // 오버레이 숨기기
    popupBtn.style.display = "none"; // 팝업 닫기 숨기기
    mapIframe.src = ""; // iframe 초기화
  }

  // 팝업 오버레이 클릭 시 팝업 닫기
  popupOverlay.addEventListener("click", closePopup);
  popupBtn.addEventListener("click", closePopup);

  // 팝업 닫기
  function locationsClosePopup() {
    locationsPopup.style.display = "none"; // 팝업 숨기기
    locationsPopupOverlay.style.display = "none"; // 오버레이 숨기기
    locationsPopupBtn.style.display = "none"; // 팝업 닫기 숨기기
    mapPopup.innerText = ""; // map 초기화
  }

  // 팝업 오버레이 클릭 시 팝업 닫기
  locationsPopupOverlay.addEventListener("click", locationsClosePopup);
  locationsPopupBtn.addEventListener("click", locationsClosePopup);

  // submit 데이터 불러오기
  const submitDataStr = localStorage.getItem("submitData");
  if (submitDataStr !== null) {
    const submitData = JSON.parse(submitDataStr); // CSV 형식이므로 쉼표로 분리

    const fieldNames = [
      "destination", // 여행 도시
      "travelDays", // 여행 일수
      "travelTheme", // 여행 스타일
      "travelStart", // 시작 시간
      "travelEnd", // 종료 시간
      "companion", // 동행자
      "budget", // 예산
      "age", // 나이
      "gender", // 성별
      "others", // 기타사항
    ];

    fieldNames.forEach((name, index) => {
      const inputElement = document.querySelector(`[name="${name}"]`);
      if (inputElement) {
        inputElement.value = submitData[index] || ""; // 값이 없으면 빈 문자열
      }
    });
  }

  const markdown = localStorage.getItem("markdown");
  if (markdown !== null) {
    addMsg(markdown);
  }

  const visitPlaceText = localStorage.getItem("array");
  if (visitPlaceText !== null) {
    console.log(visitPlaceText);
  }

  // controllerForm 제출 이벤트
  controllerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    box.innerHTML = `<span id="spinner" class="spinner-border spinner-border-sm"></span>`;

    // 제출 데이터를 변수에 저장
    const formData = new FormData(controllerForm);
    const [
      destination,
      travelDays,
      travelTheme,
      travelStart,
      travelEnd,
      companion,
      budget,
      age,
      gender,
      others,
    ] = [...formData.keys()].map((key) => formData.get(key));

    // 로컬 스토리지에 저장
    localStorage.setItem(
      "submitData",
      JSON.stringify([
        destination,
        travelDays,
        travelTheme,
        travelStart,
        travelEnd,
        companion,
        budget,
        age,
        gender,
        others,
      ])
    );

    // Gemini 2.0
    const callModel = async (prompt) => {
      try {
        const response = await axios.post(
          "https://quartz-ruddy-cry.glitch.me/0",
          {
            text: prompt,
          }
        );
        return response.data.reply;
      } catch (error) {
        console.error("Error: ", error);
      }
    };

    // Gemini 2.0 thinking
    const callModel000 = async (prompt) => {
      try {
        const response = await axios.post(
          "https://quartz-ruddy-cry.glitch.me/000",
          {
            text: prompt,
          }
        );
        return response.data.reply;
      } catch (error) {
        console.error("Error: ", error);
      }
    };

    const thirdAI = async (destination) => {
      const prompt = `${destination}의 latitude, longitude 를 작성하세요. 출력 형식은 설명 없이 { "lat": latitude, "lng": longitude } 로 출력하십시오. 다른 내용을 추가하지마십시오.
      예시: { "lat": 48.858, "lng": 2.294 }
      예시: { "lat": 37.422, "lng": 122.084 }
      다른 내용 추가하지말고
      { "lat": latitude, "lng": longitude }
      형식으로만 출력하십시오.
      `;
      return await callModel(prompt);
    };

    const thirdResponse = await thirdAI(destination);
    console.log("- **위경도**: " + thirdResponse);
    localStorage.setItem("location", JSON.stringify(thirdResponse));

    // 플래너 생성
    const fourthAI = async (
      destination,
      travelDays,
      travelTheme,
      travelStart,
      travelEnd,
      companion,
      budget,
      age,
      gender,
      others
    ) => {
      const prompt = `당신은 세계 최고의 여행플래너입니다. 아래 여행 정보와 출력 형식입니다. 이에 맞게 최적화하여 여행 계획을 작성해주세요.
여행 정보:
여행지: ${destination}
여행 일수: ${travelDays}
시작시간: ${travelStart} (여행지에 도착하는 시간)
종료시간: ${travelEnd} (여행지에서 떠나는 시간)
1인당 예산: ${budget}
테마: ${travelTheme}
나이: ${age}
성별: ${gender}
동행: ${companion}
기타 사항: ${others}


출력 형식:
장소는 HTML a 태그 형식을 사용하여 href에 URL을 작성하지 않고 href에 장소명을 영문으로 표기
예시: **<a href="장소명 영문">장소명</a>**
예시: **<a href="Eiffel Tower">에펠탑</a>**
장소가 아닌 경우 URL으로 제공
상세 일정에 Day 1, Day 2, Day 3, ... 또한 HTML a 태그 형식을 사용하여 href에 URL을 작성하지 않고 href에 Day 1, Day 2, Day 3, ... 을 표기
예시: **<a href="Day 1">Day 1</a>**
예시: **<a href="Day 2">Day 2</a>**

여행 플래너 템플릿(마크다운): 
# 여행 플래너

## 📍 여행 정보
- **여행지:**  
- **여행 기간:**  
- **여행 스타일:** (예: 휴양, 관광, 액티비티, 맛집 탐방 등)  
- **예산:**  
- **동행 인원:**  
- **필수 체크 사항:** (비자, 백신, 여행 제한 사항 등)  

---

## 🚆 교통 정보
- **현지 교통패스:**  
- **대중교통 이용 팁:**  
- **렌터카 정보:**  
- **택시/라이드쉐어 앱:**  

---

## 🏨 숙소 정보
| 날짜 | 지역 | 숙소 이름 | 가격 |
|------|------|-----------|------|
|      |      |           |      |

---

## 📅 상세 일정

### Day 1 - (날짜)
- **시간** 일정  
- **시간** 일정  
- **시간** 일정  

### Day 2 - (날짜)
- **시간** 일정  
- **시간** 일정  
- **시간** 일정  

---

## 🎭 액티비티 & 관광지
| 지역 | 장소 | 운영 시간 | 입장료 |
|------|------|---------|------|
|      |      |         |      |

---

## 🍽️ 맛집 리스트
| 지역 | 맛집 이름 | 추천 메뉴 |
|------|----------|----------|
|      |          |          |

---

## 🏥 응급 상황 대비
- **현지 긴급 번호:**  
- **대사관/영사관 연락처:**  
- **가까운 병원 및 약국:**  
- **여행자 보험 정보:**  
- **분실 시 대처법:**  

---

## 🎟️ 사전 예약 & 준비물
### ✅ 사전 예약 필수
- [ ] 예약 항목 1  
- [ ] 예약 항목 2  

### 🎒 필수 준비물
- [ ] 여권 & 비자  
- [ ] 여행자 보험 서류  
- [ ] 전자기기 (충전기, 보조배터리 등)  
- [ ] 현지 교통카드  
- [ ] 개인 약품  

---

## 💰 예상 경비
| 항목 | 예상 비용 |
|------|--------|
| 항공권 |        |
| 숙박비 |        |
| 식비 |        |
| 교통비 |        |
| 입장료 |        |
| 쇼핑 |        |
| **총합** | **0만원** |

---

## 💡 여행 팁
- ✨ 여행지별 유용한 팁  
- ✨ 현지 문화 & 에티켓  
- ✨ 와이파이 & 데이터 로밍 옵션

`;
      return await callModel000(prompt);
    };

    const fourthResponse = await fourthAI(
      destination,
      travelDays,
      travelTheme,
      travelStart,
      travelEnd,
      companion,
      budget,
      age,
      gender,
      others
    );

    localStorage.setItem("markdown", fourthResponse); // 로컬 스토리지에 저장

    const fifthAI = async (fourthResponse) => {
      const prompt = `당신은 최고의 데이터 수집가입니다. 단어만 나열하고 다른 설명 **없이** 출력하세요. 아래의 여행 플래너에서 방문 장소를 수집하여 나열해주세요. 장소는 구글에 검색하면 해당 장소가 나오도록 지역명 포함 **영어로** 작성해야합니다. 날짜 별로 중복되는 장소없이 나열하세요. 출력 형태는 방문 장소를 날짜 별로 정리하여 Javascript array 형태로 작성하세요. 날짜 별 구분자는 | 입니다. 다른 내용을 추가하지마십시오.
      예시:["첫날장소1", "첫날장소2", "첫날장소3"]|["둘째날장소1", "둘째날장소2", "둘째날장소3", "둘째날장소4"]|["셋째날장소1", "셋째날장소2"]
      예시와 같은 형식으로만 출력하고 다른 내용을 추가하지 마십시오.
${fourthResponse}`;
      return await callModel000(prompt);
    };

    // array 형태의 구분자 | 인 문자열
    const fifthResponse = await fifthAI(fourthResponse);
    console.log(`방문 장소: ${fifthResponse}`);
    const dailyArray = {};
    try {
      // array 형태의 구분자 | 인 문자열 분해
      const placeArray = fifthResponse.split("|");
      console.log("추출 성공");
      placeArray.forEach((e, index) => {
        dailyArray[`Day ${index + 1}`] = JSON.parse(e);
      });
      console.log(dailyArray);
    } catch {
      console.log("추출 실패");
    }

    const spinner = document.getElementById("spinner");
    spinner.classList.add("d-none"); // 스피너 숨기기

    addMsg(`${fourthResponse}`); // 출력

    localStorage.setItem("array", JSON.stringify(dailyArray));
  });
});
