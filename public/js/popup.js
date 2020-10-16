$(document).ready(function(){

    // Detect when one of the list elements in the popup box is hovered over
    $(document).on({
        mouseenter: function(){
            $(this).css('background-color', 'rgb(128, 128, 128)');

            $(this).children('div').css('background-color', 'rgb(98, 216, 216)');
            $(this).children('p').stop().fadeIn(150);
        },
        mouseleave: function(){
            $(this).css('background-color', 'transparent');

            $(this).children('div').css('background-color', 'green');
            $(this).children('p').stop().fadeOut(150);
        }
    }, 'ul#popup-list li:not(.popup-selected)');

    // Detect when one of the list elements in the popup box is clicked
    $(document).on({
        click: function(){
            $(this).siblings().removeClass('popup-selected');
            $(this).siblings().trigger('mouseleave');
            $(this).addClass('popup-selected');

            $('div#popup-information').children().addClass('hidden');
            console.log($('div#popup-information').children());

            // Display the information that corresponds to the clicked button
            var clickedText = $(this).text();
            if (clickedText == 'Intro') {
                $('div#popup-intro-div').removeClass('hidden');
            }
            else if (clickedText == 'Help'){
                $('div#popup-help-div').removeClass('hidden');
            }
            else {
                $('div#popup-contact-div').removeClass('hidden');
            }
        }
    }, 'ul#popup-list li:not(.popup-selected)');

    // If the user clicks the gray area outside of the popup box, the box will disapear.
    $(document).on({
        click: function(){
            $('div#popup').addClass('hidden');
            $(this).addClass('hidden');
        }
    }, 'div#popup-shadow');
});

function showPopup() {
    $('div#popup-shadow').removeClass('hidden');
    $('div#popup').removeClass('hidden');
};
