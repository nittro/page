<?php
/**
 * Created by PhpStorm.
 * User: danik
 * Date: 26/03/16
 * Time: 14:14
 */

namespace App\Presenters;
use Nittro\Bridges\NittroUI\Presenter;

abstract class BasePresenter extends Presenter {

    /** @var string */
    protected $title = 'Nittro Examples';


    protected function startup() {
        parent::startup();

        $this->getHttpResponse()->addHeader('Access-Control-Allow-Origin', '*');
        $this->getHttpResponse()->addHeader('Access-Control-Allow-Headers', 'X-Requested-With');
        $this->setDefaultSnippets(['content', 'title']);

    }



    protected function afterRender() {
        parent::afterRender();

        if ($this->isAjax()) {
            $this->payload->title = $this->title;

        }

        $this->template->title = $this->title;

    }


}
