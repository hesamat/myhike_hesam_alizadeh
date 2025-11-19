import {
    onAuthReady
} from "./authentication.js"
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// Helper function to add the sample hike documents.
function addHikeData() {
    const hikesRef = collection(db, "hikes");
    console.log("Adding sample hike data...");
    addDoc(hikesRef, {
        code: "BBY01", name: "Burnaby Lake Park Trail", city: "Burnaby",
        level: "easy", details: "A lovely place for a lunch walk.", length: 10,
        hike_time: 60, lat: 49.2467097082573, lng: -122.9187029619698,
        last_updated: serverTimestamp()
    });
    addDoc(hikesRef, {
        code: "AM01", name: "Buntzen Lake Trail", city: "Anmore",
        level: "moderate", details: "Close to town, and relaxing.", length: 10.5,
        hike_time: 80, lat: 49.3399431028579, lng: -122.85908496766939,
        last_updated: serverTimestamp()
    });
    addDoc(hikesRef, {
        code: "NV01", name: "Mount Seymour Trail", city: "North Vancouver",
        level: "hard", details: "Amazing ski slope views.", length: 8.2,
        hike_time: 120, lat: 49.38847101455571, lng: -122.94092543551031,
        last_updated: serverTimestamp()
    });
}

async function seedHikes() {
    const hikesRef = collection(db, "hikes");
    const querySnapshot = await getDocs(hikesRef);

    // Check if the collection is empty
    if (querySnapshot.empty) {
        console.log("Hikes collection is empty. Seeding data...");
        addHikeData();
    } else {
        console.log("Hikes collection already contains data. Skipping seed.");
    }
}

// Call the seeding function when the main.html page loads.
seedHikes();

// Function to read the quote of the day from Firestore
function readQuote(day) {
    const quoteDocRef = doc(db, "quotes", day); // Get a reference to the document

    onSnapshot(quoteDocRef, (docSnap) => { // Listen for real-time updates
        if (docSnap.exists()) {
            document.getElementById("quote-goes-here").innerHTML = docSnap.data().quote;
        } else {
            console.log("No such document!");
        }
    }, (error) => {
        console.error("Error listening to document: ", error);
    });
}

function setWelcomeMessage(name) {
    const nameElement = document.getElementById("name-goes-here");
    if (nameElement) {
        nameElement.textContent = `${name}!`;
    }
}

async function toggleFavorite(userId, hikeId, shouldFavorite) {
    const userRef = doc(db, "users", userId);
    return updateDoc(userRef, {
        favorites: shouldFavorite ? arrayUnion(hikeId) : arrayRemove(hikeId)
    });
}

function setFavoriteButtonState(button, isFavorite) {
    if (!button) return;
    button.textContent = isFavorite ? "Remove Favorite" : "Add to Favorites";
    button.classList.toggle("btn-outline-primary", !isFavorite);
    button.classList.toggle("btn-warning", isFavorite);
}

async function displayCardsDynamically(userId, favorites = []) {
    const cardTemplate = document.getElementById("hikeCardTemplate");
    const hikesCollectionRef = collection(db, "hikes");
    const hikeContainer = document.getElementById("hikes-go-here");
    let currentFavorites = [...favorites];

    try {
        const querySnapshot = await getDocs(hikesCollectionRef);
        querySnapshot.forEach(docSnap => {
            // Clone the template
            const newcard = cardTemplate.content.cloneNode(true);
            const hike = docSnap.data();
            const hikeId = docSnap.id;

            // Populate the card with hike data
            newcard.querySelector('.card-title').textContent = hike.name;
            newcard.querySelector('.card-text').textContent = hike.details || `Located in ${hike.city}.`;
            newcard.querySelector('.card-length').textContent = hike.length;

            newcard.querySelector('.card-image').src = `./images/${hike.code}.jpg`;

            // Add the link with the document ID
            newcard.querySelector(".read-more").href = `eachHike.html?docID=${hikeId}`;

            // Favorite button behaviour
            const favoriteButton = newcard.querySelector(".favorite-toggle");
            const isFavorite = currentFavorites.includes(hikeId);
            setFavoriteButtonState(favoriteButton, isFavorite);

            favoriteButton?.addEventListener("click", async () => {
                favoriteButton.disabled = true;
                const nowFavorite = !currentFavorites.includes(hikeId);
                try {
                    await toggleFavorite(userId, hikeId, nowFavorite);
                    if (nowFavorite) {
                        currentFavorites.push(hikeId);
                    } else {
                        currentFavorites = currentFavorites.filter(id => id !== hikeId);
                    }
                    setFavoriteButtonState(favoriteButton, nowFavorite);
                } catch (error) {
                    console.error("Failed to update favorite:", error);
                } finally {
                    favoriteButton.disabled = false;
                }
            });

            // Attach the new card to the container
            hikeContainer.appendChild(newcard);
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
    }
}

function initMainPage() {
    onAuthReady(async (user) => {
        if (!user) {
            // If no user is signed in → redirect back to login page.
            location.href = "index.html";
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data() || {};
        const name = userData.name || user.displayName || user.email;
        const favorites = Array.isArray(userData.favorites) ? userData.favorites : [];

        setWelcomeMessage(name);
        displayCardsDynamically(user.uid, favorites);
    });
}

readQuote("tuesday");
initMainPage();