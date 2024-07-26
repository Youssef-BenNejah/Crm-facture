import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Form,
  FormGroup,
  Label,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from "reactstrap";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddCompanyModal from "../Companies/AddCompanyModal";
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { parsePhoneNumber } from 'libphonenumber-js';

const EditPersonModal = ({ isOpen, toggle, person, refreshPeople, refreshCompanies, userId }) => {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [company, setCompany] = useState("");
  const [pays, setPays] = useState(null);
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [companies, setCompanies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);

  const [initialEmail, setInitialEmail] = useState("");
  const [initialPhone, setInitialPhone] = useState("");

  const options = countryList().getData(); // Country options for react-select

  useEffect(() => {
    fetchCompanies();
    if (person) {
      setPrenom(person.prenom);
      setNom(person.nom);
      setCompany(person.entreprise);
      setPays(options.find(option => option.label === person.pays));
      setTelephone(person.telephone);
      setEmail(person.email);

      // Initialize with the current values
      setInitialEmail(person.email);
      setInitialPhone(person.telephone);
    }
  }, [person, userId, options]);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/entreprise`);
      const filteredCompanies = response.data.filter(company => company.createdBy === userId);
      setCompanies(filteredCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const toggleAddCompanyModal = () => setAddCompanyModalOpen(!addCompanyModalOpen);

  const handleCompanyChange = (companyId) => {
    setCompany(companyId);
    toggleDropdown();
  };

  const checkUniqueness = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/people", {
        params: { createdBy: userId }
      });
      const userPersons = response.data;

      // Exclude the current person from the uniqueness check
      const isEmailUnique = !userPersons.some(p => p.email === email && p._id !== person._id);
      const isPhoneUnique = !userPersons.some(p => p.telephone === telephone && p._id !== person._id);

      if (!isEmailUnique) {
        toast.error('Email already exists among your contacts. Please use a different email.', {
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        return false;
      }

      if (!isPhoneUnique) {
        toast.error('Telephone number already exists among your contacts. Please use a different telephone number.', {
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking uniqueness:", error);
      toast.error('Error checking uniqueness. Please try again.', {
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      return false;
    }
  };

  const validatePhoneNumber = (phoneNumber, countryCode) => {
    try {
      const phoneNumberObj = parsePhoneNumber(phoneNumber, countryCode);
      return phoneNumberObj.isValid();
    } catch (error) {
      console.error("Phone number validation error:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pays) {
      const countryCode = pays.value;
      if (!validatePhoneNumber(telephone, countryCode)) {
        toast.error(`Invalid phone number for ${pays.label}. Please check the number format.`, {
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        return;
      }
    }

    // Only check uniqueness if email or phone number have changed
    const emailChanged = email !== initialEmail;
    const phoneChanged = telephone !== initialPhone;

    if (emailChanged || phoneChanged) {
      const isUnique = await checkUniqueness();
      if (!isUnique) return;
    }

    const updatedPerson = {
      prenom,
      nom,
      entreprise: company,
      pays: pays?.label,
      telephone,
      email
    };

    try {
      await axios.put(`http://localhost:5000/api/people/${person._id}`, updatedPerson);
      refreshPeople();
      refreshCompanies();
      toggle();
      toast.success('Person updated successfully', {
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } catch (error) {
      console.error("Error updating person:", error);
      toast.error('Error updating person. Please try again.', {
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} toggle={toggle} fade={true} className="custom-modal">
        <ModalHeader toggle={toggle}>Edit Person</ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            <FormGroup>
              <Label for="prenom">First Name</Label>
              <Input
                type="text"
                id="prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label for="nom">Last Name</Label>
              <Input
                type="text"
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label for="company">Company</Label>
              <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                <DropdownToggle caret>
                  {companies.find(c => c._id === company)?.nom || "Select Company"}
                </DropdownToggle>
                <DropdownMenu>
                  {companies.map((comp) => (
                    <DropdownItem key={comp._id} onClick={() => handleCompanyChange(comp._id)}>
                      {comp.nom}
                    </DropdownItem>
                  ))}
                  <DropdownItem divider />
                  <DropdownItem onClick={toggleAddCompanyModal} className="d-flex align-items-center">
                    <span className="ni ni-fat-add text-blue mr-2" style={{ fontSize: '24px' }}></span>
                    Add New Company
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </FormGroup>
            <FormGroup>
              <Label for="pays">Country</Label>
              <Select
                options={options}
                value={pays}
                onChange={setPays}
                placeholder="Select country"
                isClearable
                styles={{
                  control: (provided) => ({
                    ...provided,
                    border: '1px solid #ced4da',
                    borderRadius: '0.25rem',
                    transition: 'border-color 0.2s'
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 9999
                  })
                }}
              />
            </FormGroup>
            <FormGroup>
              <Label for="telephone">Tel</Label>
              <Input
                type="text"
                id="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label for="email">Email</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" type="submit">Save</Button>{' '}
            <Button color="secondary" onClick={toggle}>Cancel</Button>
          </ModalFooter>
        </Form>
      </Modal>

      <AddCompanyModal
        isOpen={addCompanyModalOpen}
        toggle={toggleAddCompanyModal}
        refreshCompany={() => {
          fetchCompanies();
          toggleAddCompanyModal();
        }}
        userId={userId}
      />
    </>
  );
};

export default EditPersonModal;
