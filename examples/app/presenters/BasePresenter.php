<?php
/**
 * Created by PhpStorm.
 * User: danik
 * Date: 26/03/16
 * Time: 14:14
 */

namespace App\Presenters;
use Nette;

abstract class BasePresenter extends Nette\Application\UI\Presenter {

    /** @var string */
    protected $title = 'Nittro Examples';

    /** @var bool */
    private $signalled = false;

    /** @var array */
    private $defaultSnippets = ['content', 'title'];



    protected function startup() {
        parent::startup();

        $this->signalled = $this->getSignal() !== null;

    }



    protected function isSignalled() {
        return $this->signalled;
    }



    protected function afterRender() {
        parent::afterRender();

        if ($this->isAjax()) {
            $this->payload->title = $this->title;

            if (!$this->isSignalled() && !$this->isControlInvalid()) {
                foreach ($this->defaultSnippets as $snippet) {
                    $this->redrawControl($snippet);

                }
            }
        }

        $this->template->title = $this->title;

    }


}
