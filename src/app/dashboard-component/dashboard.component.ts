/*
 * License: The MIT License (MIT)
 * Author:E-bank IT team
 * Author email: @ebanka-it.com
 * Date: Fri Aug 23 2019
 * Description:
 * Component for handling data to be shown on the Dashboard page
 * (Recent transactions & Exchange rate tables as far as Available ballance
 * & Fund trasfer boxes)
 *
 */
import { Component, OnInit, Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DashService } from './dashboard.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['../styles/distr/css/dashboard.component.min.css'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
@Injectable()
export class DashboardComponent implements OnInit, OnDestroy {

 // Here, we will store retrieved user data form server
  user = {
    name: '',
    surname: '',
    clientNumber: 0,
    branch: '',
    balance: 0,
    transactions: {trans: [] },
    exchangeList: [],
    limitMonthly: 0,
    usedLimit: 0
  };

  // transactions table variables
  dataSource = [];
  columnsToDisplayEng = ['description', 'amount', 'senderAccountNumber', 'date'];
  expandedElement: LastTransaction | null;

  // exchange rate table variables
  dataSource2 = [];
  columnsToDisplayExchange = ['country', 'currency', 'selling', 'buying', 'average'];
  updated = 'Not available';
  isLoading = false;
  isLoadingAPI = false;
  userIsAuthenticated = false;
  hasTransactions = false; // if there are no transactions for logged user, set a flag for front-end

  private authStatusSub: Subscription;
  private userSub: Subscription;

  constructor(
    private authService: AuthService, public dashService: DashService) {}

  ngOnInit() {
    this.isLoading = true;
    this.isLoadingAPI = true;
    const userId = this.authService.getUserId();
    this.dashService.getUserData(userId);
    this.userSub = this.dashService.getUserDataListener()
      .subscribe((
        userData: {
           name: string,
           surname: string,
           clientNumber: number,
           branch: string,
           balance: number,
           transactions: {trans: [] },
           exchangeList: [],
           limitMonthly: number,
           usedLimit: number
          }) => {
        this.isLoading = false;
        this.user = userData;
        let dataSourceTemp = [];
        this.user.transactions.trans.map((element, index) => {
          dataSourceTemp.push(element);
          dataSourceTemp[index].date = this.dashService.dateFromISO8601(element.date);
          dataSourceTemp[index].dateKnjizenja = this.dashService.dateFromISO8601(element.dateKnjizenja);
        });
        this.dataSource = dataSourceTemp;
        if (this.dataSource.length > 0) {
          this.hasTransactions = true;
        }
        this.user.exchangeList[0].img = 'rub';
        this.user.exchangeList[1].img = 'cny';
        this.user.exchangeList[2].img = 'usd';
        this.user.exchangeList[3].img = 'gbp';
        this.user.exchangeList[4].img = 'jpy';
        this.dataSource2 = [
          this.user.exchangeList[0],
          this.user.exchangeList[1],
          this.user.exchangeList[2],
          this.user.exchangeList[3],
          this.user.exchangeList[4]
        ];
        this.updated = this.user.exchangeList[0].updated;
        this.isLoadingAPI = false;
      });
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
      });
  }
  ngOnDestroy() {
    this.userSub.unsubscribe();
  }

}

/*
 * Interface for accessing transaction fields
*/
export interface LastTransaction {
  date: string;
  dateKnjizenja: string;
  amount: number;
  paymentMethod: string;
  senderAccountNumber: number;
  receiverAccountNumber: number;
  description: string;
}

export interface ExchangeCurr {
  country: string;
  currency: string;
  selling: string;
  buying: string;
  average: string;
}
