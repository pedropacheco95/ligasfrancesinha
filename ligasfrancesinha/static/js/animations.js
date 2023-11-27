window.addEventListener('load', loadHandler);
window.addEventListener('scroll', scrollHandler);

function loadHandler(){
    showProgress();
    appearOnScroll();
    onloadLoaderCheck();
    createCarrousel();
    createCountdown();
}

function scrollHandler(){
    appearOnScroll();
}

function showProgress() {
    let progress_bars = document.querySelectorAll('.progressBar_fill');
    progress_bars.forEach((bar) => {
        let value = bar.dataset.progress;
        bar.style.opacity = 1;
        bar.style.width = `${value}%`;
    });
}

function appearOnScroll() {
    let reveals = document.querySelectorAll('.appearing')

    reveals.forEach((reveal) => {
        let windowHeight = window.innerHeight;
        let revealTop = reveal.getBoundingClientRect().top;
        let revealPoint = 150;

        if (revealTop < windowHeight - revealPoint){
            reveal.classList.add('active');
        }else{
            reveal.classList.remove('active');
        }
    });
}

function showOtherImage(next_previous){
    let current_image = document.querySelector('.image_shown');
    let sibling;
    if (next_previous == 'next'){
        sibling = current_image.nextElementSibling
    }else if (next_previous == 'previous'){
        sibling = current_image.previousElementSibling
    }
    if (sibling.classList.contains('hidden_image')){
        sibling.classList.add('image_shown');
        sibling.classList.remove('hidden_image');
        current_image.classList.remove('image_shown');
        current_image.classList.add('hidden_image');
    }
}

function loaderCheck(){
    let loader = document.querySelector('.circle-loader');
    let checkmark = document.querySelector('.checkmark');
    let message = document.querySelector('.contribution_thank_you');
    let message2 = document.querySelector('.confirmation_thank_you');
    if (!message){
        message = message2;
    }
    if (loader){
        loader.classList.add('load-complete');
        checkmark.style.display = 'block';
        message.style.opacity = 1;
    }
}

function onloadLoaderCheck(){
    setInterval(loaderCheck, 2000);
}

function createCarrousel(){
    let isThrottle = false;
    let carrouselInners =  document.querySelectorAll('.carousel-inner');
    let carouselCurrentIndex = 0;
    carrouselInners.forEach((carrousel) => {

        const children = carrousel.children;
        const totalChildren = children.length;
        const viewportWidth = window.innerWidth;
        const childWidth = children[0].offsetWidth;
        const ratio = (childWidth / viewportWidth) * 100;
        let carouselStartX;
        let carouselCurrentX;
        let isDraggingCarousel = false;
        
        setCarrouselCellsPositions(carrousel,ratio,totalChildren,children);

        const startDrag = (clientX) => {
            
            isDraggingCarousel = true;
            carouselStartX = clientX;
            carouselCurrentX = 0;
            carrousel.classList.add('is-dragging');
        };
    
        const onDrag = (clientX) => {
            let direction;
            if (!isDraggingCarousel) return;
            carouselCurrentX = clientX - carouselStartX;
            if (carouselCurrentX < -10) {
                direction = -1;
            } else if (carouselCurrentX > 0) {
                direction = 1;
            }
            carouselCurrentIndex = updateCarousel(carrousel,ratio,carouselCurrentIndex,-direction,totalChildren,children);
            isDraggingCarousel = false;
        };

        carrousel.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
        document.addEventListener('touchmove', (e) => onDrag(e.touches[0].clientX));
        
        carrousel.addEventListener('wheel', function(event) {
            event.preventDefault();
            
            if (!isThrottle) {
                const isHorizontalScroll = Math.abs(event.wheelDeltaX) > Math.abs(event.wheelDeltaY) || Math.abs(event.deltaX) > Math.abs(event.deltaY);
                
                if (isHorizontalScroll) {
                    const scrollDirection = event.wheelDeltaX < 0 || event.deltaX > 0 ? -1 : 1;
                    carouselCurrentIndex = updateCarousel(carrousel,ratio,carouselCurrentIndex,-scrollDirection,totalChildren,children);
                    isThrottle = true;
                }
                setTimeout(() => {
                    isThrottle = false;
                }, 1500); 
            }
        });

        carrousel.parentNode.querySelector('.carousel-control-prev').addEventListener('click', () => {
            carouselCurrentIndex = updateCarousel(carrousel,ratio,carouselCurrentIndex,-1,totalChildren,children);
        });
        carrousel.parentNode.querySelector('.carousel-control-next').addEventListener('click', () => {
            carouselCurrentIndex = updateCarousel(carrousel,ratio,carouselCurrentIndex,1,totalChildren,children);
        });
    });
}

function updateCarousel(carrousel,ratio,carouselCurrentIndex,direction,totalChildren,children) {
    let last_position = totalChildren-1
    
    const setLeftStyle = (childIndex, percentage) => {
        children[childIndex].style.left = `${percentage}%`;
    };

    const setZIndex = (childIndex, zValue) => {
        children[childIndex].style.zIndex = zValue;
    };
    
    function animateTransform(element, distance, n_steps, startX, endX) {
        let currentX = startX;
        const stepSize = (distance / n_steps);
        let stepCount = 0;
    
        const interval = setInterval(() => {
            stepCount++;
            let nextX = currentX + (stepSize * stepCount);
            if (Math.abs(nextX + ratio * last_position) < Math.abs(stepSize/2)) {
                currentX = ratio - (stepSize * stepCount);
                nextX = currentX + (stepSize * stepCount);
                setLeftStyle(last_position,-ratio);
                setLeftStyle(0,0);
                element.style.transform = `translateX(${nextX}%)`;
            } else if (Math.abs(nextX - ratio) < stepSize/2) {
                currentX = - (ratio * last_position) - (stepSize * stepCount);
                nextX = currentX + (stepSize * stepCount);
                setLeftStyle(last_position, ratio * last_position);
                setLeftStyle(0, ratio * totalChildren);
                element.style.transform = `translateX(${nextX}%)`;
            } else {
                element.style.transform = `translateX(${nextX}%)`;
            }
    
            if (stepCount >= n_steps) {
                clearInterval(interval);
            }
        }, 1);
    }
    if (direction == 1){
        if (carouselCurrentIndex == 1){
            setLeftStyle(last_position, ratio * last_position);
            setZIndex(last_position,1)
        } else if (carouselCurrentIndex == last_position-2){
            setLeftStyle(0, ratio * totalChildren);
            setZIndex(0,1)
        } else if (carouselCurrentIndex == last_position){
            setZIndex(last_position,15)
            setZIndex(0,14)
            setZIndex(1,13)
        }

    } else if (direction == -1){
        if (carouselCurrentIndex == last_position-1){
            setLeftStyle(0, 0);
            setZIndex(0,1)
        } else if (carouselCurrentIndex == 2){
            setLeftStyle(last_position, ratio * (-1));
            setZIndex(last_position,1)
        } else if (carouselCurrentIndex == 0){
            setZIndex(0,15)
            setZIndex(last_position,14)
            setZIndex(last_position - 1,13)
        }
    }

    let currentX = (100 - ratio)/2 - carouselCurrentIndex*ratio
    carouselCurrentIndex += direction;
    carouselCurrentIndex = ((carouselCurrentIndex % totalChildren) + totalChildren) % totalChildren;
    let newX= (100 - ratio)/2 - carouselCurrentIndex*ratio;
    animateTransform(carrousel, - direction * ratio, 100, currentX, newX)

    removeClassFromAllElements('carousel-indicator-active')
    document.getElementById('carousel_indicator_' + carouselCurrentIndex).classList.add('carousel-indicator-active')
    return carouselCurrentIndex
}


function setCarrouselCellsPositions(ele,ratio,totalChildren,children){
    if (!ele) {
        console.error("Element not provided");
        return;
    }

    ele.style.transform = `translateX(${(100 - ratio)/2}%)`;

    for (let i = 0; i < totalChildren; i++) {
        const child = children[i];

        let position = (i === totalChildren - 1 ? -1 : i);

        const leftPosition = ratio * position;
        child.style.left = `${leftPosition}%`;
    }
}

function showTab(ele){
    if (ele.classList.contains('active')){
        return
    }
    let target_id = ele.dataset.target_id

    addOrRemoveClass('.'+target_id,'active')
    addOrRemoveClass('.'+ele.classList[0],'active')
}

function createCountdown() {
    const countdownElements = document.querySelectorAll('.countdown-timer');

    countdownElements.forEach(function(timerElement) {
        const targetDatetime = new Date(timerElement.getAttribute('data-target-datetime'));

        const interval = setInterval(function() {
            const now = new Date();
            const difference = targetDatetime - now;

            if (difference <= 0) {
                clearInterval(interval);
                timerElement.textContent = 'Countdown finished';
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            timerElement.querySelector('#days').textContent = days.toString().padStart(2, '0');
            timerElement.querySelector('#hours').textContent = hours.toString().padStart(2, '0');
            timerElement.querySelector('#minutes').textContent = minutes.toString().padStart(2, '0');
            timerElement.querySelector('#seconds').textContent = seconds.toString().padStart(2, '0');
        }, 1000);
    });
}