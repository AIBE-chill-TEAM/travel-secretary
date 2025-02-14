import { supabase, mateTable, ptsTable, matebucketName } from "./config.js";

import { checkLogin, getProfile, logout } from "../../js/auth.js";

const editBtn = document.querySelector("#edit-btn");
const deleteBtn = document.querySelector("#delete-btn");
const completeBtn = document.querySelector("#complete-btn");

async function getUserInfo() {
  const { data: userInfo, error } = await supabase.auth.getUser();
  if (error) {
    console.log("유저 정보 가져오기 실패: ", error);
    return null;
  }
  return userInfo.user;
}

function setupEventListeners(postingId) {
  document
    .querySelector("#list-btn")
    .addEventListener("click", () => redirectToPage("./index.html"));
  editBtn.addEventListener("click", () =>
    redirectToPage(`./edit.html?id=${postingId}`)
  );
  deleteBtn.addEventListener("click", () => {
    if (confirm("게시글을 삭제하시겠습니까?")) handleDelete(postingId);
  });
  completeBtn.addEventListener("click", () => {
    if (confirm("모집완료 처리하시겠습니까?")) handleComplete(postingId);
  });
}

async function handleComplete(postingId) {
  try {
    const { error: completeError } = await supabase
      .from(mateTable)
      .update({ state: false })
      .eq("id", postingId);

    if (completeError) {
      console.error("모집완료 처리 실패: ", completeError);
      return;
    }
    console.log("모집완료 처리 성공: ", postingId);
    window.location.reload();
  } catch (error) {
    console.error("모집 완료 처리 중 오류: ", error);
  }
}

async function handleDelete(postingId) {
  try {
    const { error: deleteError } = await supabase
      .from(mateTable)
      .delete()
      .eq("id", postingId);
    if (deleteError) {
      console.error("게시글 삭제 실패: ", deleteError);
      return;
    }
    console.log("게시글 삭제 성공: ", postingId);
    redirectToPage("./index.html");
  } catch (error) {
    console.error("게시글 삭제 중 오류: ", error);
  }
}

function redirectToPage(url) {
  window.location.href = url;
}

async function fetchPostingDetail(postingId, userId) {
  console.log(postingId);
  try {
    const { data: posting, error } = await supabase
      .from(mateTable)
      .select(
        ` 
		  id,
		  user_id,
		  title,
		  destination,
		  start_date,
		  end_date,
		  people,
		  budget,
		  content,
		  created_at,
		  image_url,
		  state,
		  styles: ${ptsTable} (  
			style_id (
			  style_name
			)
		  ),
		  userInfo: user_id ( 
			username,
			gender,
			age,
      image_url
		  )
		`
      )
      .eq("id", postingId)
      .single();
    if (error) {
      console.error("게시글 상세 정보 조회 실패:", error);
      return null;
    }
    // console.log(posting);
    displayDetails(posting);

    if (posting.user_id === userId) {
      editBtn.removeAttribute("hidden");
      deleteBtn.removeAttribute("hidden");

      if (posting.state) {
        completeBtn.removeAttribute("hidden");
      }
    }
  } catch (error) {
    console.error("게시글 상세 정보 조회 중 오류:", error);
  }
}

function displayDetails(posting) {
  const state = posting.state ? "모집중" : "모집완료";
  document.querySelector(
    "#detail-title"
  ).textContent = `[${state}] ${posting.title}`;

  document.querySelector("#detail-author-username").textContent =
    posting.userInfo.username;

  // console.log("image_url", posting.userInfo.image_url);
  const authorImageArea = document.querySelector("#detail-author-image-area");
  if (posting.userInfo.image_url) {
    const profileImage = document.createElement("img");
    const { data } = supabase.storage
      .from(matebucketName)
      .getPublicUrl(posting.userInfo.image_url);

    profileImage.src = data.publicUrl;
    profileImage.alt = "Profile Image";
    profileImage.width = 32;
    profileImage.height = 32;
    profileImage.className = "rounded-circle";

    authorImageArea.appendChild(profileImage);
  } else {
    authorImageArea.innerHTML = `<i class="bi bi-person-circle me-2" style="font-size: 1.5rem"></i> `;
  }

  const genderText =
    posting.userInfo?.gender === 1
      ? "남성"
      : posting.userInfo?.gender === 2
      ? "여성"
      : "미제공";
  document.querySelector("#detail-author-gender").textContent = genderText;

  const imageArea = document.querySelector("#detail-image-area");

  if (posting.image_url) {
    console.log("posting.image_url", posting.image_url);
    const { data: imageUrlData } = supabase.storage
      .from(matebucketName)
      .getPublicUrl(posting.image_url);

    const imageElement = document.createElement("img");
    imageElement.src = imageUrlData.publicUrl;
    imageElement.alt = "게시글 이미지";
    imageElement.classList.add("card-img-top", "detail-image");
    imageElement.style.width = "300px";
    imageArea.appendChild(imageElement);
  } else {
    imageArea.innerHTML = '<div class="image-placeholder rounded"></div>';
    const placeholder = imageArea.querySelector(".image-placeholder");
    placeholder.classList.add(
      "bg-light",
      "d-flex",
      "justify-content-center",
      "align-items-center",
      "p-4"
    );
    placeholder.style.height = "150px";
    placeholder.textContent = "No Image";
  }

  document.querySelector(
    "#detail-author-age"
  ).textContent = `${posting.userInfo?.age} 세`;
  document.querySelector("#detail-destination").textContent =
    posting.destination;
  document.querySelector("#detail-people").textContent = `${posting.people} 명`;

  const formattedBudget = posting.budget
    ? parseInt(posting.budget).toLocaleString()
    : "미정";
  document.querySelector("#detail-budget").textContent = formattedBudget;

  document.querySelector(
    "#detail-date"
  ).textContent = `기간: ${posting.start_date} - ${posting.end_date}`;
  document.querySelector("#detail-content").textContent = posting.content;

  const styleTags = document.querySelector("#detail-styles-tags");
  if (posting.styles && posting.styles.length > 0) {
    posting.styles.forEach((style) => {
      const styleTag = document.createElement("span");
      styleTag.classList.add("badge", "bg-secondary", "me-1", "mb-1");
      styleTag.textContent = `#${style.style_id.style_name}`;
      styleTags.appendChild(styleTag);
    });
  }

  document.querySelector("#detail-created-at").textContent =
    getFormattedDateTime(posting.created_at);
}

function getFormattedDateTime(dateString) {
  const date = new Date(dateString);
  return (
    `${date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} ` +
    `${date.toLocaleTimeString("ko-KR", {
      hour12: true,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })}`
  );
}

async function initializePage() {
  const islogined = await checkLogin();
  if (!islogined) {
    window.location.href =
      "https://aibe-chill-team.github.io/travel-secretary/";
    alert("로그인이 필요합니다");
  }

  const username = localStorage.getItem("username") || "Guest";
  document.getElementById("username").textContent = username + " 님";

  if (localStorage.getItem("profile_img")) {
    const profile_img =
      "https://frqevnyaghrnmtccnerc.supabase.co/storage/v1/object/public/mate-bucket/" +
      localStorage.getItem("profile_img");
    const profile = document.querySelector("#profile");
    profile.src = profile_img;
  } else {
    const data = await getProfile();

    if (!data.image_url == "") {
      var profile_img =
        "https://frqevnyaghrnmtccnerc.supabase.co/storage/v1/object/public/mate-bucket/" +
        data.image_url;
    } else {
      var profile_img =
        "https://frqevnyaghrnmtccnerc.supabase.co/storage/v1/object/public/mate-bucket/profile/profile.jpg";
    }
    const profile = document.querySelector("#profile");
    profile.src = profile_img;
  }

  document.getElementById("logout").addEventListener("click", async (event) => {
    event.preventDefault();
    await logout();
    window.location.href = "../index.html";
  });

  const urlParams = new URLSearchParams(window.location.search);
  const postingId = urlParams.get("id");

  if (!postingId) {
    alert("잘못된 접근입니다.");
    redirectToPage("/");
    return;
  }
  console.log("postingId:", postingId); // 추출된 postingId 값 확인 (디버깅 용)

  const user = await getUserInfo();
  if (!user) return;
  setupEventListeners(postingId);
  fetchPostingDetail(postingId, user.id);
}

document.addEventListener("DOMContentLoaded", initializePage);

// ...
