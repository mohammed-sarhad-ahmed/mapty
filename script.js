'use strict';

//
class WorkOut {
  id = String(Date.now()).slice(-10);
  #clicks = 0;
  date = new Date();
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _setDescribtion() {
    // prettier-ignore

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.discribtion = `${this.type[0].toUpperCase()}${this.type
      .slice(1)
      .toLowerCase()} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} at ${
      String(this.date.getHours()).length === 1 ? '0' : ''
    }${this.date.getHours()}:${
      String(this.date.getMinutes()).length === 1 ? '0' : ''
    }${this.date.getMinutes()}`;
    this.date = this.date.toISOString();
  }

  increaseOnClick() {
    this.#clicks++;
  }
}
class Cycling extends WorkOut {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.#CalcSpeed();
    this._setDescribtion();
  }

  #CalcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

class Runnig extends WorkOut {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this._setDescribtion();
    this.cadence = cadence;
    this.#calcPace();
  }

  #calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let sort = false;

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    this.#getPosition();
    document.querySelector('.Sort').addEventListener(
      'click',
      function (e) {
        sort = sort ? false : true;
        this.#sorter.call(this, e, sort);
      }.bind(this)
    );
    form.addEventListener('submit', this.#newWorkout.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this.#deleteOneByOne.bind(this)
    );
    document
      .querySelector('.DeleteAllDiv')
      .addEventListener('click', this.reset.bind(this));
    inputType.addEventListener('change', this.#toggleElevationFiedls);
    containerWorkouts.addEventListener('click', this.#popup.bind(this));
    this.#getLocalStorage();
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this.#renderWorkout(workout);
    });
  }

  #popup(e) {
    const workoutEl = e.target.closest('.workout');
    const span = e.target.classList.contains('deleter');
    if (!workoutEl || span) return;
    const workout = this.#workouts.find(el => el.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 2,
    });
  }

  #getPosition() {
    navigator.geolocation.getCurrentPosition(
      this.#loadMap.bind(this),
      this.#userBlockedPositionTraking.bind(this),
      {
        enableHighAccuracy: true,
      }
    );
  }

  #loadMap(position) {
    const { longitude, latitude } = position.coords;
    console.log(position);
    const userCoords = [latitude, longitude];
    const latlng = L.latLng(...userCoords);
    this.#map = L.map('map').setView(latlng, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);
    this.#map.on('click', this.#showForm.bind(this));
    this.#workouts.forEach(workout => {
      this.#renderWorkoutMarker(workout);
    });
  }

  #userBlockedPositionTraking() {
    alert(' you can not use the webpage');
  }

  #showForm(event) {
    this.#mapEvent = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  #toggleElevationFiedls() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  async #newWorkout(e) {
    try {
      e.preventDefault();
      const CheckIfItIsValid = (...inputs) =>
        inputs.every(inp => Number.isFinite(inp));
      const CheckIfItIsPositive = (...inputs) => inputs.every(inp => inp > 0);
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const { lat, lng } = this.#mapEvent.latlng;
      let workout;

      if (type === 'cycling') {
        const elevationGain = +inputElevation.value;
        if (
          !CheckIfItIsPositive(distance, duration) ||
          !CheckIfItIsValid(distance, duration, elevationGain)
        )
          return alert('invaild input');

        workout = new Cycling(distance, duration, [lat, lng], elevationGain);
      }
      if (type === 'running') {
        const cadane = +inputCadence.value;
        if (
          !CheckIfItIsPositive(distance, duration, cadane) ||
          !CheckIfItIsValid(distance, duration, cadane)
        )
          return alert('invaild input');

        workout = new Runnig(distance, duration, [lat, lng], cadane);
      }
      this.#workouts.push(workout);
      this.#hideForm();
      await this.#getWeather(workout);
      this.#renderWorkoutMarker(workout);
      this.#setLocalStorage();
      this.#renderWorkout(workout);
    } catch (err) {
      console.log(err);
    }
  }

  #renderWorkoutMarker(workout) {
    const popUp = L.popup({
      minWidth: 100,
      autoPan: false,
      maxWidth: 250,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    });
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(popUp)
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}` +
          workout.discribtion +
          ` in ${workout.weather.location.name}🌡️${workout.weather.current.temp_c}°C 🌈${workout.weather.current.condition.text}  `
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
    
    
    <li class="workout workout--${workout.type}" data-id=${workout.id}>

        </div>
          <h2 class="workout__title">${workout.discribtion} 
           <span class=deleter${
             workout.type === 'running' ? 'R' : 'C'
           }>X</span></h2>

          <div class="workout__details">
            <span class="workout__icon"> ${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏙️</span>
            <span class="workout__value">${workout.weather.location.name}</span>
          </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        `;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        `;
    }
    html += `<div class="workout__details">
            <span class="workout__icon">🌈</span>
            <span class="workout__value">${workout.weather.current.condition.text}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🌡️</span>
            <span class="workout__value">${workout.weather.current.temp_c}</span>
            <span class="workout__unit">°C
</span>
          </div>
          </li>`;

    form.insertAdjacentHTML('afterend', html);
    this.#showDeleteBtn();
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  #sorter(e, sort) {
    console.log(this.#workouts);
    e.stopPropagation();
    if (sort) {
      this.#workouts.sort((a, b) => {
        if (a.date > b.date) return -1;
        else return 1;
      });
    } else if (sort === false) {
      this.#workouts.sort((a, b) => {
        if (a.date > b.date) return 1;
        else return -1;
      });
    }
    document.querySelectorAll('li').forEach(el => {
      el.remove();
    });
    this.#workouts.forEach(el => {
      this.#renderWorkout(el);
    });
  }
  #showDeleteBtn() {
    document.querySelectorAll('.DeleteAll').forEach(el => {
      el.classList.add('DeleteAllAfter');
    });
  }

  #deleteOneByOne(e) {
    if (
      !e.target.classList.contains('deleterC') &&
      !e.target.classList.contains('deleterR')
    )
      return;
    const theOneForDeletion = e.target.closest('li');
    const theOneForDeletionID = theOneForDeletion.dataset.id;
    const theOneForDeletionIndex = this.#workouts.findIndex(el => {
      el.id === theOneForDeletionID;
    });
    this.#workouts.splice(theOneForDeletionIndex, 1);
    theOneForDeletion.remove();
    this.#setLocalStorage();
    location.reload();
  }
  async #getWeather(workout) {
    if (workout.weather) return;
    try {
      const [lat, lag] = workout.coords;
      const TheWeatherDataFromTheAjaxCall = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=d5cf23fdd8e343abac422716231207&q=${lat},${lag}&aqi=no`
      );
      if (!TheWeatherDataFromTheAjaxCall.ok)
        throw new Error('the data was not found');
      const theWeatherDataFormated = await TheWeatherDataFromTheAjaxCall.json();
      workout.weather = theWeatherDataFormated;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

const app = new App();
