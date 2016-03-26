<?php
/**
 * Created by PhpStorm.
 * User: danik
 * Date: 26/03/16
 * Time: 12:55
 */

namespace App\Presenters;


class SnippetsPresenter extends BasePresenter {

    public function renderPage2() {
        $this->title .= ' :: Page 2';
    }

    public function renderPage3() {
        $this->title .= ' :: Page 3';
    }

}
