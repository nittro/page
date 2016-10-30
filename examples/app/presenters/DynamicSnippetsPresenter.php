<?php
/**
 * Created by PhpStorm.
 * User: danik
 * Date: 26/03/16
 * Time: 19:15
 */

namespace App\Presenters;



class DynamicSnippetsPresenter extends BasePresenter {

    /** @var array */
    private $entries = null;

    public function actionRegenerate() {
        $session = $this->getSession('dynamicDemo');
        unset($session->entries);
        $this->redirect('default');

    }

    public function handleAdd() {
        // somehow create a new entry and store it in the db
        $session = $this->getSession('dynamicDemo');

        if (isSet($session->entries)) {
            $entries = $session->entries;
            $last = end($entries);
            $id = $last->id + 1;

        } else {
            $entries = [];
            $id = 1;

        }

        $entry = $this->createEntry($id);

        $entries[$id] = $entry;
        $session->entries = $entries;

        // now the crucial part:
        // 1) say hello
        $this->flashMessage('Entry #' . $id . ' has been created');

        // 2) redirect, or at least fake it if this is an AJAX request
        //  - any code after this will only execute during AJAX requests
        $this->postGet('this');

        // 3) save the new entry to the $entries property
        //  - this will make Nette render only the new / edited entry
        $this->entries = [$id => $entry];

        // 4) redraw the entry list
        $this->redrawControl('entries');

    }


    public function handleUpdate($id) {
        $session = $this->getSession('dynamicDemo');

        if (isSet($session->entries, $session->entries[$id])) {
            $entries = $session->entries;
            $entries[$id]->value = mt_rand(1, 100);
            $session->entries = $entries;
            $this->entries = [$id => $entries[$id]];

            $this->flashMessage('Entry #' . $id . ' has been updated');

        } else {
            $this->flashMessage('Entry #' . $id . ' not found');
            $this->entries = [];

        }

        $this->postGet('this');
        $this->redrawControl('entries');

    }


    public function handleRemove($id) {
        $session = $this->getSession('dynamicDemo');

        if (isSet($session->entries, $session->entries[$id])) {
            $entries = $session->entries;
            unset($entries[$id]);
            $session->entries = $entries;

            $this->flashMessage('Entry #' . $id . ' has been removed');

        } else {
            $this->flashMessage('Entry #' . $id . ' not found');

        }

        $this->postGet('this');
        $this->sendPayload();

    }



    public function renderDefault() {
        $this->template->entries = $this->getEntries();
        $this->title .= ' :: Dynamic snippets';

    }

    public function renderSorted() {
        $entries = $this->getEntries();

        uasort($entries, function($a, $b) {
            $r = $a->value - $b->value;

            if ($r !== 0) {
                return $r;
            }

            return $a->id - $b->id;

        });

        $this->template->entries = $entries;
        $this->title .= ' :: Dynamic snippets';

    }


    public function getEntries() {
        if ($this->entries === null) {
            // load from DB
            $session = $this->getSession('dynamicDemo');

            if (isSet($session->entries)) {
                $this->entries = $session->entries;

            } else {
                $this->entries = $session->entries = $this->createDemoEntries();

            }
        }

        return $this->entries;

    }

    private function createDemoEntries() {
        $ids = range(1, 20);
        return array_combine($ids, array_map([$this, 'createEntry'], $ids));

    }

    private function createEntry($id) {
        return (object) [
            'id' => $id,
            'name' => 'Entry #' . $id,
            'value' => mt_rand(0, 100),
        ];
    }

}
