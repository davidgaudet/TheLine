var gallery_json = null;

$(document).ready(function(){
    // Gallery button, handle click
    $(document).on({
        click: function(){
            showGalleryPopup();
        }
    }, 'div#menu-gallery-div');

    // Detected mouse click on an image in the gallery
    $(document).on({
        click: function(){
            var imageSrc = $(this).children('img').attr('src');
            $('div#enlarged-image-shadow').removeClass('hidden');
            $('img#enlarged-image').attr('src', imageSrc);
            $('img#enlarged-image').removeClass('hidden');
        }
    }, 'div#gallery-div span');

    // Help button, handle click
    $(document).on({
        click: function(){
            showHelpPopup();
        }
    }, 'div#menu-help-div');

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

            // Display the information that corresponds to the clicked button
            var clickedText = $(this).text();
            if (clickedText == 'Intro') {
                $('div#popup-intro-div').removeClass('hidden');
            }
            else if (clickedText == 'Mechanics'){
                $('div#popup-help-div').removeClass('hidden');
            }
        }
    }, 'ul#popup-list li:not(.popup-selected)');

    // If the user clicks the gray area outside of the popup box, the box will disapear.
    $(document).on({
        click: function(){
            $('div#help-popup').addClass('hidden');
            $('div#gallery-popup').addClass('hidden');
            $(this).addClass('hidden');
        }
    }, 'div#popup-shadow');

    // If the user clicks the gray area outside of the enlarged image, the image will disapear
    $(document).on({
        click: function(){
            $('img#enlarged-image').addClass('hidden');
            $(this).addClass('hidden');
        }
    }, 'div#enlarged-image-shadow');
});

function showGalleryPopup() {
    $('div#popup-shadow').removeClass('hidden');
    $('div#gallery-popup').removeClass('hidden');
};

function showHelpPopup() {
    $('div#popup-shadow').removeClass('hidden');
    $('div#help-popup').removeClass('hidden');
};

function populateGallery(galleryJson) {
    for (let index = galleryJson['files_to_load']; index > 0; index--) {
        var current_file = galleryJson['file_' + index];
        $('span#cell' + index + ' img').attr("src", "./img/gallery/" + current_file['file_name']);
        $('span#cell' + index + ' p').text(current_file['date_added']);
        $('span#cell' + index).removeClass('hidden');
    }
}
