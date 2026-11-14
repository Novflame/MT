UPDATE `exams` SET `type` = 'FINAL' WHERE lower(trim(`type`)) = 'final' AND `type` <> 'FINAL';
