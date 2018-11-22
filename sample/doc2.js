#!/usr/bin/env node
/*
	Freedesktop.org Notifications

	Copyright (c) 2015 - 2018 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/
"use strict" ;

var notifications = require( '../lib/notifications.js' ) ;

var notif = notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	icon: __dirname + '/log.png' ,
	sound: __dirname + '/hiss.wav' ,
	actions: {
		default: '' ,
		ok: 'OK!' ,
		nope: 'Nope!'
	}
} ) ;

notif.on( 'action' , function( action ) {
	console.log( "Action '%s' was clicked!" , action ) ;
} ) ;

notif.on( 'close' , function( closedBy ) {
	console.log( "Closed by: '%s'" , closedBy ) ;
} ) ;

notif.push() ;

