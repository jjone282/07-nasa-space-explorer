// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const spaceFact = document.getElementById('spaceFact');

const modal = document.getElementById('apodModal');
const closeModalButton = document.getElementById('closeModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

const APOD_API_URL = 'https://api.nasa.gov/planetary/apod';
const API_KEY = 'MRcRACM4eI3FfRQwvJb6GjIpMfNY7IRaqs79f18M';
const REQUEST_TIMEOUT_MS = 45000;

const spaceFacts = [
	'A day on Venus is longer than a year on Venus. It spins very slowly on its axis.',
	'Neutron stars can spin more than 600 times each second.',
	'Jupiter is so big that all the other planets in our solar system could fit inside it.',
	'The footprints left on the Moon can last for millions of years because there is no wind.',
	'Saturn could float in water because it is mostly made of gas and has low density.',
	'The observable universe is about 93 billion light-years across.',
	'A teaspoon of material from a neutron star would weigh around a billion tons on Earth.'
];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

function showRandomSpaceFact() {
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);

	spaceFact.innerHTML = `
		<h2>Did You Know?</h2>
		<p>${spaceFacts[randomIndex]}</p>
	`;
}

function showLoadingMessage() {
	gallery.innerHTML = `
		<div class="placeholder loading">
			<p>Loading space photos...</p>
		</div>
	`;
}

function showErrorMessage(message) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">!</div>
			<p>${message}</p>
		</div>
	`;
}

function openModal(item) {
	modalImage.src = item.hdurl || item.url;
	modalImage.alt = item.title;
	modalTitle.textContent = item.title;
	modalDate.textContent = item.date;
	modalExplanation.textContent = item.explanation;

	modal.classList.remove('hidden');
	modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
	modal.classList.add('hidden');
	modal.setAttribute('aria-hidden', 'true');
}

function renderGallery(items) {
	gallery.innerHTML = '';

	const imageItems = items.filter((item) => item.media_type === 'image');

	if (imageItems.length === 0) {
		showErrorMessage('No images were found in this date range. Try different dates.');
		return;
	}

	// Show newest images first for a better gallery experience
	imageItems.reverse().forEach((item) => {
		const card = document.createElement('article');
		card.className = 'gallery-item';

		card.innerHTML = `
			<img src="${item.url}" alt="${item.title}" />
			<h3>${item.title}</h3>
			<p>${item.date}</p>
		`;

		card.addEventListener('click', () => openModal(item));
		gallery.appendChild(card);
	});
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;
	const isValidDate = /^\d{4}-\d{2}-\d{2}$/;

	if (!startDate || !endDate) {
		showErrorMessage('Please choose both a start date and an end date.');
		return;
	}

	if (!isValidDate.test(startDate) || !isValidDate.test(endDate)) {
		showErrorMessage('Please choose valid dates in YYYY-MM-DD format.');
		return;
	}

	showLoadingMessage();

	async function requestApod(apiKey, retries = 1) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		const url = new URL(APOD_API_URL);
		url.searchParams.set('api_key', apiKey);
		url.searchParams.set('start_date', startDate);
		url.searchParams.set('end_date', endDate);

		try {
			const response = await fetch(url.toString(), { signal: controller.signal });
			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.msg || 'Could not load NASA images right now. Please try again.');
			}

			return response.json();
		} catch (error) {
			clearTimeout(timeoutId);

			if (error.name === 'AbortError') {
				if (retries > 0) {
					return requestApod(apiKey, retries - 1);
				}

				throw new Error('NASA is taking too long to respond. Please check your internet and try again.');
			}

			throw error;
		}
	}

	try {
		let data = null;
		let lastError = null;
		const keysToTry = ['DEMO_KEY', API_KEY].filter((key, index, arr) => key && arr.indexOf(key) === index);

		for (const key of keysToTry) {
			try {
				data = await requestApod(key, 1);
				break;
			} catch (error) {
				lastError = error;
			}
		}

		if (!data) {
			throw lastError || new Error('Could not load NASA images right now. Please try again.');
		}

		const items = Array.isArray(data) ? data : [data];
		renderGallery(items);
	} catch (error) {
		const friendlyMessage = error.message.includes('expected pattern')
			? 'The API request URL was invalid. Please refresh and try again.'
			: error.message;

		showErrorMessage(friendlyMessage);
	}
}

getImagesButton.addEventListener('click', getSpaceImages);

closeModalButton.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
	// Close when user clicks outside the modal content
	if (event.target === modal) {
		closeModal();
	}
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
		closeModal();
	}
});

showRandomSpaceFact();
getSpaceImages();
