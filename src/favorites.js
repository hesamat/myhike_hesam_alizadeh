import { onAuthReady } from "./authentication.js";
import { db } from "./firebaseConfig.js";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";

function setEmptyState(visible) {
    const emptyMessage = document.getElementById("favorites-empty");
    if (emptyMessage) {
        emptyMessage.classList.toggle("d-none", !visible);
    }
}

async function removeFavorite(userId, hikeId) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        favorites: arrayRemove(hikeId)
    });
}

function buildCard(hike, hikeId, template, onRemove) {
    const newCard = template.content.cloneNode(true);
    newCard.querySelector(".card-title").textContent = hike.name;
    newCard.querySelector(".card-text").textContent = hike.details || `Located in ${hike.city}.`;
    newCard.querySelector(".card-length").textContent = hike.length;
    newCard.querySelector(".card-image").src = `./images/${hike.code}.jpg`;
    newCard.querySelector(".read-more").href = `eachHike.html?docID=${hikeId}`;

    const removeBtn = newCard.querySelector(".remove-favorite");
    removeBtn?.addEventListener("click", async () => {
        removeBtn.disabled = true;
        try {
            await onRemove(hikeId, removeBtn.closest(".col"));
        } catch (error) {
            console.error("Failed to remove favorite:", error);
            removeBtn.disabled = false;
        }
    });

    return newCard;
}

async function loadFavorites(userId) {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() || {};
    const favorites = Array.isArray(userData.favorites) ? userData.favorites : [];

    const cardTemplate = document.getElementById("favoriteCardTemplate");
    const cardContainer = document.getElementById("favorites-go-here");

    if (favorites.length === 0) {
        setEmptyState(true);
        return;
    }

    for (const hikeId of favorites) {
        const hikeRef = doc(db, "hikes", hikeId);
        const hikeDoc = await getDoc(hikeRef);
        if (!hikeDoc.exists()) {
            continue;
        }

        const hike = hikeDoc.data();
        const card = buildCard(hike, hikeId, cardTemplate, async (id, cardElement) => {
            await removeFavorite(userId, id);
            cardElement?.remove();
            if (!cardContainer?.children.length) {
                setEmptyState(true);
            }
        });

        cardContainer.appendChild(card);
    }
}

function initFavoritesPage() {
    onAuthReady(async (user) => {
        if (!user) {
            location.href = "index.html";
            return;
        }

        await loadFavorites(user.uid);
    });
}

initFavoritesPage();
