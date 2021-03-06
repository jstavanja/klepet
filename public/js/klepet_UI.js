function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function elementImage(sporocilo) {
  return $('<img src="' + sporocilo + '" width="200px" style="padding-left: 20px;" />');
}

function elementVideo(sporocilo) {
  return $('<iframe src="https://www.youtube.com/embed/' + sporocilo + '" width="200px" height="150px" style="padding-left: 20px;" allowfullscreen></iframe>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    izpisSlik(sporocilo, "local");
    izpisVideev(sporocilo, "local");
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    izpisSlik(sporocilo, "socket");
    izpisVideev(sporocilo, "socket");
  });
  
  socket.on('dregljaj', function (sporocilo) {
    // console.log("Prišel v funkcijo za tresenje."); (morda napaka v preimenovanju knjižnjice jRumble? jp)
    
    // Initialize jRumble on Selector
    $('#vsebina').jrumble();

    // Start rumble on element
    $('#vsebina').trigger('startRumble');
    
    // Stop rumble on element after 1500 ms == 1,5s
    setTimeout(function() { $('#vsebina').trigger('stopRumble'); }, 1500);
    
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
  });
  
  socket.on('uporabniki', function(uporabniki) {
    
    $("#seznam-uporabnikov div").click(function() {
     
      var trenutniUporabnik = $(this).text();
      document.querySelector("#poslji-sporocilo").value = '/zasebno "' + trenutniUporabnik + '"';
      document.querySelector("#poslji-sporocilo").focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function izpisSlik(sporocilo, tipIzpisa) {
  
  var tekst;
  
  if(tipIzpisa == "socket") {
    tekst = sporocilo.besedilo;
  } else {
    tekst = sporocilo;
  }
  
  tekst = tekst.split(" ");
  
  for(var i in tekst) {
    if(tekst[i].slice(-5) == ".jpeg" || tekst[i].slice(-4) == ".jpg" || tekst[i].slice(-4) == ".gif" || tekst[i].slice(-4) == ".png") {
      $('#sporocila').append(elementImage(tekst[i]));
    }
  }
} 
  
function izpisVideev(sporocilo, tipIzpisa) {
  
  var tekst;
  if(tipIzpisa == "socket") {
    tekst = sporocilo.besedilo;
  } else {
    tekst = sporocilo;
  }

  tekst = tekst.split(' ');

  for(var j in tekst) {
    if (tekst[j].slice(0, 32) == "https://www.youtube.com/watch?v=") {
      tekst[j] = tekst[j].replace("https://www.youtube.com/watch?v=", "");
      $('#sporocila').append(elementVideo(tekst[j]));
      console.log("zaznan https video");
    }
  }
}