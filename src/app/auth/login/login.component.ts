/*
 * License: The MIT License (MIT)
 * Author:E-bank IT team
 * Author email: @ebanka-it.com
 * Date: Fri Aug 23 2019
 * Description:
 * Component to control behaviour of
 * login form.
 *
 */

import {Component, OnDestroy, OnInit, ElementRef} from '@angular/core';
import { NgForm } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['../../styles/distr/css/login.component.min.css']
})

export class LoginComponent implements OnInit, OnDestroy {
  isLoading = false;
  isVerified = true;
  isLogin = true;
  resendMessage = false;
  resendResetMessage = false;
  resetMessage = false;
  resetPassword = false;
  verifyEmail = '';
  passResetEmail = '';
  userName = '';
  private authStatusSub: Subscription;
  private verifStatusSub: Subscription;
  private resendStatusSub: Subscription;
  private resetPasswordStatusSub: Subscription;
  constructor(public authService: AuthService, private el: ElementRef) {}

  ngOnInit() {
    setTimeout(() => { // this will make the execution after the above boolean has changed
      this.el.nativeElement.querySelector('#email').focus();
    }, 0);
    this.authStatusSub = this.authService.getAuthStatusListener().subscribe(
      authStatus => {
        this.isLoading = false;
      }
    );
  }

  onLogin(form: NgForm) {
    if (form.invalid) {
      return;
    }
    this.isLoading = true;
    this.authService.login(form.value.email, form.value.password);
    this.verifyEmail = form.value.email;
    this.verifStatusSub = this.authService.getVerificationStatusListener().subscribe(
      verifStatus => {
         this.isVerified = verifStatus;
         if (verifStatus === false) {
          this.isLoading = false;
         }
         this.verifStatusSub.unsubscribe();
       }
     );
  }
  onResendVerifMail(email: string, userName: string) {
    this.authService.resendVerifMail(email, userName);
    this.resendStatusSub = this.authService.getResendStatusListener().subscribe(
          resendStatus => {
            this.resendMessage = true;
            this.isLoading = false;
            this.resendStatusSub.unsubscribe();
          });
  }
  onResendPasswordReset(email: string, userName: string) {
    this.resendResetMessage = true;

  }

  onSendPasswordReset(form: NgForm) {
    if (form.invalid) {
      return;
    }
    this.authService.resetPassword(form.value.email);
    this.resetPasswordStatusSub = this.authService.getResetPasswordListener().subscribe(
        resetStatus => {
          this.resetMessage = true;
          this.resetPassword = false;
          this.isLogin = false;
          this.resetPasswordStatusSub.unsubscribe();
        });
  }
  onResetPassword(state: boolean) {
    this.resetPassword = state;
    setTimeout(() => { // this will make the execution after the above boolean has changed
      this.el.nativeElement.querySelector('#email').focus();
    }, 0);
  }
  resetIsVerified() {
    this.isVerified = true;
  }
  resetResendPassMessage() {
    this.resendResetMessage = false;
    this.resetMessage = false;
    this.isLogin = true;
  }
  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }
}
