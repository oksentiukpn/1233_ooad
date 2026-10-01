// Основные параметры
var Orfo = {
	contlen:	100,
	maxlen:		400,
	seltag1:	"<u>",
	seltag2:	"</u>",
	zindex:		10000,
	nostat:		0,
	lang:		'uk',
	url:		"/laws/orfo",
	// Ukrainian (Український) - 'uk', win-1251 encoding
	lng: {
		// Сообщения для confrim
		alt:		"Якщо Ви побачили помилку в тексті, виділіть її мишкою та натисніть Ctrl-Enter. Будемо вдячні!",
		badbrowser:	"Ваш броузер не підтрумує функцію виділення помилок!",
		toobig:		"Ви визначили занадто великий обсяг тексту!",
		subject:	"Орфографічна помилка",
		docmsg:		"Адреса сторінки",
		thanks:		"Повідомлення відправлено. Дякуємо за співпрацю!",
		error:		"Виникла помилка при виконанні запиту!",
		// Сообщения для css
		title:		"Повідомити про помилку",
		header:		"Текст з помилкою, взятий зі сторінки:",
		comment:	"Інформація про помилку (не обов`язково):",
		name:		"Ваше ім'я:",
		email:		"Ваш e-mail:",
		send:		"Відправити",
		cancel:		"Відмовитись",
		close:		"закрити",
		// Надпись по-умолчанию в #orfo_cont = (contkey+contlen+contnam).replace("{contlen}", contlen)
		contkey:	"Для того, щоб тут з'явився <u>текст помилки</u>, виділіть його мишкою та натисніть <em class=\"nowrap\">Ctrl-Enter</em>.",
		contlen:	"Максимальний розмір виділеної фрази &mdash; не більше <strong>{contlen}</strong> символів.",
		conttxt:	"Краще за все виділяти слово або фразу цілком, а причину помилки чи правильний варіант вказувати в полі нижче.",
		contnam:	"Також можна вказати своє ім'я та e-mail, щоб адміністратор зміг уточнити незрозумілі моменти."
	}
};

// Чтобы инициализовать Orfo:
// $(document).ready(function(){
//	$.initOrfo({settings})
// });

// Варианты работы системы:
// orfoSourceType: 'dynamic', 'confrim'
// - dynamic (создается <div id="+id+">...</div> с сообщением) - по умолчанию!
//   Можно передать готовую форму в окне в параметре orfoSourceID
// - confrim (ничего не создается, работает через системные сообщения)

// Можно указать тип комментирования (если окно расчитывается = dynamic)
// orfoComment: 'none', 'comm', 'email', 'full'
// - none (просто отправить то, что выделили, или если не в режиме dynamic)
// - comm (один необязательный текстовый комментарий)
// - email (данные пользователя - имя и e-mail адрес)
// - full (comm + email)

(function($){
	var get_cont = function() {
		with (Orfo.settings) with (Orfo.lng) {
			var result = contkey + " " +contlen.replace("{contlen}", Orfo.contlen);
			if (orfoComment=='full' || orfoComment=='comm') result += " " + conttxt;
			if (orfoComment=='full' || orfoComment=='email') result += " " + contnam;
			return result;
		}
	}

	var get_context = function() {
		try{
			var text=null;
			var selection=null;
			if (w.getSelection) {
				selection=w.getSelection();
			} else {
				if (d.getSelection) {
					selection=d.getSelection();
				} else {
					selection=d.selection;
				}
			}
			if (selection!=null) {
				var prev="", text=null, next="";
				if (selection.getRangeAt) {
					var r=selection.getRangeAt(0);
					text=r.toString();
					var rngA=d.createRange();
					rngA.setStartBefore(r.startContainer.ownerDocument.body);
					rngA.setEnd(r.startContainer,r.startOffset);
					prev=rngA.toString();
					var rngB=r.cloneRange();
					rngB.setStart(r.endContainer,r.endOffset);
					rngB.setEndAfter(r.endContainer.ownerDocument.body);
					next=rngB.toString();
				} else {
					if (selection.createRange) {
						var r=selection.createRange();
						text=r.text;
						var rngA=selection.createRange();
						rngA.moveStart("character",-Orfo.contlen);
						rngA.moveEnd("character",-text.length);
						prev=rngA.text;
						var rngB=selection.createRange();
						rngB.moveEnd("character",Orfo.contlen);
						rngB.moveStart("character",text.length);
						next=rngB.text;
					} else {
						text=""+selection;
					}
				}
				if (text=="") return null;
				var p;
				var s = (p=text.match(/^(\s*)/)) && p[0].length;
				var e = (p=text.match(/(\s*)$/)) && p[0].length;
				prev += text.substring(0,s);
				Orfo.prev = prev.substring(prev.length-Orfo.contlen,prev.length).replace(/^\S{1,10}\s+/,"");
				next = text.substring(text.length-e,text.length)+next;
				Orfo.next = next.substring(0,Orfo.contlen).replace(/\s+\S{1,10}$/,"");
				Orfo.text = text.substring(s,text.length-e);
				return true;
			} else {
				alert(Orfo.lng.badbrowser);
				return false;
			}
		} catch(e) {
			return null;
		}
	};

	var do_send = function() {
		with (Orfo.settings) {
			var data = {
				lang: Orfo.lang,
				ref: d.location.href,
				nostat: Orfo.nostat,
				prev: Orfo.prev,
				text: Orfo.text,
				next: Orfo.next
			};
			if (orfoSourceType=='dynamic') {
				if (orfoComment=='full' || orfoComment=='comm') data.comm = $('#orfoForm input[name="comm"]').val();
				if (orfoComment=='full' || orfoComment=='email') {
					data.name = $('#orfoForm input[name="name"]').val();
					data.email = $('#orfoForm input[name="email"]').val();
				}
				if ($('#orfoForm input[name="nospam"]').length) {
					data.nospam = getCookie('sid');
				}
				if ($('#orfoForm input[name="code"]').length) {
					data.code = $('#orfoForm input[name="code"]').val();
					data.recode = $('#orfoForm input[name="recode"]').val();
				}
				if ($('#g-recaptcha-response').length) {
					data['g-recaptcha-response'] = $('#g-recaptcha-response').val();
				}
			}
			if (loader) $.loader(true, Orfo.settings);
			$.ajax({
				type: "POST",
				url: Orfo.url,
				data: data,
				success: function(data, textStatus){
					do_thanks();
				},
				error: function(){
					alert(Orfo.lng.error);
				},
				complete: function(){
					if (loader) $.loader(false, Orfo.settings);
				}
			});
			
		}
		return false;
	};

	var do_thanks = function() {
		$('#orfoForm').clearForm();
		Orfo.prev = '';
		Orfo.next = '';
		Orfo.text = '';
		alert(Orfo.lng.thanks)
	};

	// Вариант со стандартным диалогом
	var do_confirm = function(reccurent) {
		var ts=new Date().getTime();
		var result=confirm(Orfo.lng.docmsg+"\
--------------------------------------\n   "+d.location.href+"\n\n"+Orfo.lng.subject+"\
--------------------------------------\n   \"..."+Orfo.cont+"...\"\
--------------------------------------\n\n"+Orfo.lng.title);
		var dt=new Date().getTime()-ts;
		if (result) {
			do_send();
		} else {
			if (!reccurent && dt<50) {
				var sv = d.onkeyup;
				d.onkeyup = function(e) {
					if (!e) e = window.event;
					if (e.keyCode==17) { // Ctrl is up.
						d.onkeyup = sv;
						do_confirm(true);
					}
				};
			}
		}
	};

	var do_check = function(click) {
		if(navigator.appName.indexOf("Netscape")!=-1 && eval(navigator.appVersion.substring(0,1))<5){
			alert(Orfo.lng.badbrowser);
			return false;
		}
		Orfo.cont = '';
		if (!get_context()) {
			if (click) with (Orfo.settings) {
				if (orfoSourceType=='dynamic') {
					$("#"+orfoSourceID).modal('show');
				} else {
					alert(Orfo.lng.alt);
				}
			}
			return false;
		}
		var cont=(Orfo.prev+Orfo.seltag1+Orfo.text+Orfo.seltag2+Orfo.next).trims();
		if (cont.length > Orfo.maxlen) {
			alert(Orfo.lng.toobig);
			return false;
		}
		Orfo.cont = cont;
		with (Orfo.settings) {
			if (orfoSourceType=='dynamic') {
				// Вариант с красивым окошком
				$("#"+orfoSourceID).modal('show');
			} else {
				// Вариант со стандартным диалогом
				do_confirm();
			}
		}
		return true;
	};

	// Основные перехватчики
	var on_keypress = function(e) {
		var pressed=0;
		var we=w.event;
		if (we) {
			// IE & Opera
			pressed=we.keyCode==10 || // IE
				(we.keyCode==13 && we.ctrlKey); // Opera
		} else if (e) {
			pressed=(e.which==10 && e.modifiers==2) || // NN4
				(e.keyCode==0 && e.charCode==106 && e.ctrlKey) ||
				(e.keyCode==13 && e.ctrlKey); // Mozilla
		}
		if (pressed) {
			do_check();
			return false;
		}
	};
	// Обработка Esc клавиши
	var on_keydown_esc = function(e) {
		var code=0;
		var we=w.event;
		if (we) {
			code=we.keyCode;
			if (we.keyCode==13) {
			}
		} else {
			if(e)code=e.keyCode;
		}
		with (Orfo.settings) {
			if (code==13 && !$("#orfoForm button[type=submit]").attr("disabled")) {
				do_send();
				$("#"+orfoSourceID).modal('hide');
				return false;
			}
			if (code==27) $("#"+orfoSourceID).modal('hide');
		}
	};

	// Заполняем форму параметрами и показываем
	var active_but = function(active){
		$("#orfoForm button[type=submit]").prop('disabled', !active);
	}
	var orfoOnOpen = function(e){
		d.onkeydown = on_keydown_esc;
		d.onkeypress = null;
		if (Orfo.cont!='') {
			$("#orfo_cont").html("..."+Orfo.cont+"...");
			if (Orfo.settings.orfoComment!='none') $('#orfoForm input[name="comm"]').blur(null).focus();
			active_but(1);
			Orfo.cont = '';
		} else {
			$("#orfo_cont").html(get_cont());
			if (Orfo.settings.orfoComment!='none') $('#orfoForm input[name="comm"]').blur(function(){
				active_but($(this).val()!="");
			}).focus();
			active_but(0);
		}
	};
	var orfoOnClose = function(e){
		d.onkeydown = null;
		d.onkeypress = on_keypress;
	};
	
	$.checkOrfo = function(){
				do_check(1);
				return false;
			};
	//initOrfo       
	$.initOrfo = function(settings){
		Orfo.settings = $.extend(Orfo.settings, {
		//------main settings
			id: 'orfoWindow',
			orfoSourceID: '',
			orfoSourceUrl: Orfo.url,
			orfoSourceType: 'dynamic',			// dynamic, confrim
			orfoComment: 'comm',				// full, email, comm, none
			effects: true,
			loader: true,					// картинка при отправке
		//------other
			on_open: orfoOnOpen,
			on_close: orfoOnClose
		}, settings || {});
		with (Orfo.settings) {
			if (orfoSourceType=='dynamic') {
				var create_window = false;
				if (orfoSourceID=='' && $('*').is('#'+id)) {
					orfoSourceID = id	
				} else {
					create_window = (orfoSourceID!='' && !$('*').is('#'+orfoSourceID));
					if (create_window && orfoSourceID=='') {
						// Идентификатор окна
						orfoSourceID = id+Math.round(Math.random()*1000)
					}
				}
				if (create_window) with (Orfo.lng) {
					// Тут надо допечатать окно с формой
					var s =
					'<div id="'+orfoSourceID+'" class="modal fade">'+
					'<div class="modal-dialog modal-lg" role="document">'+
					'<div class="modal-content">'+
						'<div class="modal-header bg-header">'+
							'<h4 class="modal-title"><i class="fa fa-check-square-o"></i> '+title+'</h4>'+
							'<button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
							'	<span aria-hidden="true">&times;</span>'+				
							'</button>'+
						'</div>'+
						'<form id="orfoForm" action="'+orfoSourceUrl+'" method="post">'+
						'<div class="modal-body">'+
							'<label>'+header+'</label>'+
							'<div id="orfo_cont" class="p-3 mb-3 code">'+
								get_cont()+
							'</div>';
					if (orfoComment=='full' || orfoComment=='comm') {
						s = s +	'<div class="mb-3">'+
								'<label for="orfo-comm">'+comment+'</label>'+
								'<input type="text" class="form-control" id="orfo-comm" name="comm" maxlength="1000" />'+
							'</div>';
					}
					if (orfoComment=='full' || orfoComment=='email') {
						s = s +	'<div class="row">'+
								'<div class="col">'+
									'<label for="orfo-name">'+name+'</label>'+
									'<input type="text" class="form-control" id="orfo-name" name="name" maxlength="100">'+
								'</div>'+
								'<div class="col">'+
									'<label for="orfo-email">'+email+'</label>'+
									'<input type="email" class="form-control" id="orfo-email" name="email">'+
								'</div>'+
							'</div>';
					}
					s = s +	'</div>'+
						'<div class="modal-footer">'+
							'<button type="submit" class="btn btn-primary text-uppercase" disabled>'+send+'</button>'+
							'<button type="button" class="btn btn-secondary text-uppercase" data-dismiss="modal">'+cancel+'</button>'+
						'</div>'+
						'</form>'+
					'</div>'+
					'</div>'+
					'</div>';
					// Добавим в конец
					$('body').append(s);
				}
			}
			// События при открытии-закрытии окна
			$("#"+orfoSourceID).on('show.bs.modal', on_open);
			$("#"+orfoSourceID).on('hide.bs.modal', on_close);

			// Перехватываем кнопки
			on_close();

			// Отправка формы
			$("#orfoForm").submit(function(){
				do_send();
				$("#"+orfoSourceID).modal('hide');
				return false;
			});

			// Открытие по баннеру
			$('#orfoButton').click($.checkOrfo);
		}
	}

})(jQuery);
